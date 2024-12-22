// 工作流引擎
// 工作流引擎负责解析任务链并调度任务
import type { ContextManager } from "./ContextManager";
import type { TaskExecutor } from "./TaskExecutor";
import type { TaskRegistry } from "./TaskRegistry";

// 条件分支
interface ConditionBranch {
  condition: (context: ContextManager) => boolean; // 条件函数
  next: string | string[]; // 满足条件时的任务链
}

interface ConditionNode {
  branches: ConditionBranch[]; // 所有分支
  default?: string | string[]; // 默认任务链（当所有条件都不满足时）
}

export interface WorkflowDefinition {
  steps: Array<string | string[]>; // 支持顺序和并行任务
}

export class WorkflowEngine {
  private taskRegistry: TaskRegistry;
  private executor: TaskExecutor;

  constructor(taskRegistry: TaskRegistry, executor: TaskExecutor) {
    this.taskRegistry = taskRegistry;
    this.executor = executor;
  }

  async run(workflow: WorkflowDefinition): Promise<void> {
    for (const step of workflow.steps) {
      if (Array.isArray(step)) {
        // 并行执行
        await Promise.all(step.map(taskName => this.runTask(taskName)));
      } else {
        // 顺序执行
        await this.runTask(step);
      }
    }
  }

  private async runTask(taskName: string): Promise<void> {
    const task = this.taskRegistry.getTask(taskName);
    if (!task) throw new Error(`Task "${taskName}" not found`);
    await this.executor.execute(task);
  }
}
