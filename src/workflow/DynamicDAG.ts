import {
  DAGWorkflowEngine,
  type DAG,
  type DAGTask,
  type TaskStatus,
} from './DAG';
import { ContextManager } from './ContextManager';
import { TaskExecutor } from './TaskExecutor';
import EventEmitter from 'eventemitter3';

export interface TaskPlan {
  tasks: DAGTask[];
  dependencies: Map<DAGTask, DAGTask[]>;
}

export interface TaskPlanner {
  plan(input: string, context: ContextManager): Promise<TaskPlan>;
  addExecutionResult(result: TaskExecutionResult): void;
  getExecutionHistory(): TaskExecutionResult[];
}

interface TaskExecutionResult {
  taskName: string;
  status: 'completed' | 'failed';
  output?: any;
  error?: string;
}

interface PendingTask {
  task: DAGTask;
  dependencies: DAGTask[];
}

export class DynamicDAGWorkflowEngine extends DAGWorkflowEngine {
  private taskPlanner: TaskPlanner;
  private isPaused: boolean = false;
  private currentPlan: TaskPlan | null = null;
  private dynamicCompletedTasks: Set<DAGTask> = new Set();
  private taskResults: Map<string, TaskExecutionResult> = new Map();

  constructor(executor: TaskExecutor, taskPlanner: TaskPlanner) {
    super(executor);
    this.taskPlanner = taskPlanner;
    this.executor.getContext().set('completedTasks', []);
  }

  async planAndRun(input: string): Promise<void> {
    // 生成任务计划
    this.currentPlan = await this.taskPlanner.plan(
      input,
      this.executor.getContext()
    );

    // 构建 DAG
    const dag: DAG = {
      tasks: this.currentPlan.tasks,
    };

    // 设置任务依赖
    for (const [
      task,
      dependencies,
    ] of this.currentPlan.dependencies.entries()) {
      task.dependsOn = dependencies;
    }

    // 运行工作流
    await this.run(dag);
  }

  async addTask(task: DAGTask, dependencies: DAGTask[] = []): Promise<void> {
    if (!this.currentPlan) {
      throw new Error('No active plan. Call planAndRun first.');
    }

    // 添加新任务
    this.currentPlan.tasks.push(task);
    this.currentPlan.dependencies.set(task, dependencies);

    // 重新构建 DAG
    const dag: DAG = {
      tasks: this.currentPlan.tasks,
    };

    // 更新所有任务的依赖
    for (const [t, deps] of this.currentPlan.dependencies.entries()) {
      t.dependsOn = deps;
    }

    // 继续执行
    await this.run(dag);
  }

  async removeTask(task: DAGTask): Promise<void> {
    if (!this.currentPlan) {
      throw new Error('No active plan. Call planAndRun first.');
    }

    // 移除任务
    this.currentPlan.tasks = this.currentPlan.tasks.filter((t) => t !== task);
    this.currentPlan.dependencies.delete(task);

    // 更新其他任务的依赖
    for (const deps of this.currentPlan.dependencies.values()) {
      const index = deps.indexOf(task);
      if (index !== -1) {
        deps.splice(index, 1);
      }
    }

    // 重新构建 DAG
    const dag: DAG = {
      tasks: this.currentPlan.tasks,
    };

    // 更新所有任务的依赖
    for (const [t, deps] of this.currentPlan.dependencies.entries()) {
      t.dependsOn = deps;
    }

    // 继续执行
    await this.run(dag);
  }

  pause(): void {
    this.isPaused = true;
    this.emit('workflowPaused');
  }

  resume(): void {
    this.isPaused = false;
    this.emit('workflowResumed');
  }

  getCurrentPlan(): TaskPlan | null {
    return this.currentPlan;
  }

  getTaskResults(): Map<string, TaskExecutionResult> {
    return new Map(this.taskResults);
  }

  protected async runTask(task: DAGTask): Promise<void> {
    if (this.isPaused) {
      await new Promise<void>((resolve) => {
        const resumeHandler = () => {
          this.removeListener('workflowResumed', resumeHandler);
          resolve();
        };
        this.once('workflowResumed', resumeHandler);
      });
    }

    if (!task.name) {
      throw new Error('Task name is required');
    }

    try {
      await super.runTask(task);

      // 记录任务执行结果
      const result: TaskExecutionResult = {
        taskName: task.name,
        status: 'completed',
        output: this.executor.getContext().get(task.name),
      };
      this.taskResults.set(task.name, result);
      this.taskPlanner.addExecutionResult(result);

      // 任务完成后，更新已完成任务列表
      this.dynamicCompletedTasks.add(task);
      const completedTasks = Array.from(this.dynamicCompletedTasks);
      this.executor.getContext().set('completedTasks', completedTasks);

      // 检查是否有待处理的任务可以执行
      await this.processPendingTasks();
    } catch (error) {
      // 记录任务失败结果
      const result: TaskExecutionResult = {
        taskName: task.name,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
      this.taskResults.set(task.name, result);
      this.taskPlanner.addExecutionResult(result);
      throw error;
    }
  }

  private async processPendingTasks(): Promise<void> {
    const context = this.executor.getContext();
    const pendingTasks = (context.get('pendingTasks') || []) as PendingTask[];
    const completedTasks = context.get('completedTasks') || [];

    // 过滤出可以执行的任务
    const executableTasks = pendingTasks.filter(({ task, dependencies }) => {
      return dependencies.every((dep: DAGTask) => completedTasks.includes(dep));
    });

    // 执行可执行的任务
    for (const { task, dependencies } of executableTasks) {
      await this.addTask(task, dependencies);
    }

    // 更新待处理任务列表
    const remainingTasks = pendingTasks.filter(({ task, dependencies }) => {
      return !dependencies.every((dep: DAGTask) =>
        completedTasks.includes(dep)
      );
    });
    context.set('pendingTasks', remainingTasks);
  }
}
