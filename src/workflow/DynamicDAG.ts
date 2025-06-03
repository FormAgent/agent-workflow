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
}

export class DynamicDAGWorkflowEngine extends DAGWorkflowEngine {
  private taskPlanner: TaskPlanner;
  private isPaused: boolean = false;
  private currentPlan: TaskPlan | null = null;

  constructor(executor: TaskExecutor, taskPlanner: TaskPlanner) {
    super(executor);
    this.taskPlanner = taskPlanner;
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
    await super.runTask(task);
  }
}
