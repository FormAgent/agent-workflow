import { type TaskPlanner, type TaskPlan } from './DynamicDAG';
import { type DAGTask } from './DAG';
import { ContextManager } from './ContextManager';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Message } from 'ai';
import { TaskRegistry } from './TaskRegistry';
import { DynamicDAGWorkflowEngine } from './DynamicDAG';
import { TaskExecutor } from './TaskExecutor';

interface TaskInfo {
  name: string;
  description: string;
  dependencies: string[];
}

interface TaskExecutionResult {
  taskName: string;
  status: 'completed' | 'failed';
  output?: any;
  error?: string;
}

export class LLMTaskPlanner implements TaskPlanner {
  private model: string;
  private systemPrompt: string;
  private taskRegistry: TaskRegistry;
  private executionHistory: TaskExecutionResult[] = [];

  constructor(model: string = 'gpt-4-turbo') {
    this.model = model;
    this.taskRegistry = TaskRegistry.getInstance();
    this.systemPrompt = `You are a task planning expert. Your job is to break down user requests into a series of tasks and their dependencies.

Available tasks:
${this.getAvailableTasksDescription()}

For each task, you should:
1. Choose from the available tasks above
2. Define a clear purpose and scope
3. Identify its dependencies on other tasks
4. Ensure the task graph is acyclic
5. Consider task execution results when planning next steps

Output format:
{
  "tasks": [
    {
      "name": "TaskName",
      "description": "What this task does",
      "dependencies": ["DependentTask1", "DependentTask2"]
    }
  ],
  "reasoning": "Explain your task planning decisions",
  "adjustments": {
    "add": ["TaskName1", "TaskName2"],
    "remove": ["TaskName3"],
    "modify": ["TaskName4"]
  }
}`;
  }

  private getAvailableTasksDescription(): string {
    const tasks = this.taskRegistry.getAllTasks();
    return tasks
      .map(
        (task) =>
          `- ${task.name}: ${
            task.description
          }\n  Capabilities: ${task.capabilities.join(', ')}`
      )
      .join('\n');
  }

  async plan(input: string, context: ContextManager): Promise<TaskPlan> {
    const executionHistory = this.executionHistory
      .map(
        (result) =>
          `Task: ${result.taskName}, Status: ${result.status}${
            result.error ? `, Error: ${result.error}` : ''
          }`
      )
      .join('\n');

    const executionHistoryPrompt = executionHistory
      ? `\n\nExecution History:\n${executionHistory}`
      : '';

    // 创建一个不包含循环引用的上下文对象
    const contextData = context.getAll();
    const safeContext = Object.fromEntries(
      Object.entries(contextData).filter(([key, value]) => {
        // 过滤掉可能导致循环引用的对象
        return (
          !(value instanceof DynamicDAGWorkflowEngine) &&
          !(value instanceof TaskExecutor) &&
          !(value instanceof ContextManager)
        );
      })
    );

    const messages: Message[] = [
      {
        id: 'system-1',
        role: 'system',
        content: `You are a task planner. Plan tasks based on the input and current context.
Available tasks: ${Array.from(this.taskRegistry.getAllTasks())
          .map((task) => task.name)
          .join(', ')}`,
      },
      {
        id: 'user-1',
        role: 'user',
        content: `Plan tasks for: ${input}\n\nCurrent context: ${JSON.stringify(
          safeContext
        )}${executionHistoryPrompt}`,
      },
    ];

    const result = await streamText({
      model: openai(this.model),
      system: this.systemPrompt,
      messages,
    });

    const response = await result.text;
    const plan = JSON.parse(response) as {
      tasks: TaskInfo[];
      reasoning: string;
      adjustments?: {
        add?: string[];
        remove?: string[];
        modify?: string[];
      };
    };

    // 将计划转换为 TaskPlan
    const tasks: DAGTask[] = [];
    const dependencies = new Map<DAGTask, DAGTask[]>();

    // 首先创建所有任务
    for (const taskInfo of plan.tasks) {
      const taskDefinition = this.taskRegistry.getTask(taskInfo.name);
      if (!taskDefinition) {
        throw new Error(`Unknown task: ${taskInfo.name}`);
      }
      tasks.push(taskDefinition.createTask());
    }

    // 然后设置依赖关系
    for (const taskInfo of plan.tasks) {
      const task = tasks.find((t) => t.name === taskInfo.name);
      if (!task) continue;

      const deps = taskInfo.dependencies
        .map((depName: string) => tasks.find((t) => t.name === depName))
        .filter((t): t is DAGTask => t !== undefined);

      dependencies.set(task, deps);
    }

    // 存储规划理由
    context.set('planReasoning', plan.reasoning);

    return { tasks, dependencies };
  }

  // 添加任务执行结果
  addExecutionResult(result: TaskExecutionResult): void {
    this.executionHistory.push(result);
  }

  // 清除执行历史
  clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  // 获取执行历史
  getExecutionHistory(): TaskExecutionResult[] {
    return [...this.executionHistory];
  }
}
