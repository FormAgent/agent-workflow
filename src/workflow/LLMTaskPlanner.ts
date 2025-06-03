import { type TaskPlanner, type TaskPlan } from './DynamicDAG';
import { type DAGTask } from './DAG';
import { type ContextManager } from './ContextManager';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Message } from 'ai';
import { TaskRegistry } from './TaskRegistry';

interface TaskInfo {
  name: string;
  description: string;
  dependencies: string[];
}

export class LLMTaskPlanner implements TaskPlanner {
  private model: string;
  private systemPrompt: string;
  private taskRegistry: TaskRegistry;

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

Output format:
{
  "tasks": [
    {
      "name": "TaskName",
      "description": "What this task does",
      "dependencies": ["DependentTask1", "DependentTask2"]
    }
  ]
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
    const result = await streamText({
      model: openai(this.model),
      system: this.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Plan tasks for: ${input}\n\nCurrent context: ${JSON.stringify(
            context.getAll()
          )}`,
        } as Message,
      ],
    });

    const response = await result.text;
    const plan = JSON.parse(response) as { tasks: TaskInfo[] };

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

    return { tasks, dependencies };
  }
}
