// 工作流引擎
// 工作流引擎负责解析任务链并调度任务
// 支持条件分支，我们需要让工作流的执行路径根据任务的输出或上下文状态动态调整。这种能力可以用于处理多样化的输入需求，如：
// 根据意图选择不同的任务链。
// 根据任务结果动态跳转到不同的后续任务。
// 核心逻辑
// 条件节点

// 条件分支在工作流中用一个特殊节点表示。
// 节点包含条件逻辑（如函数）以及对应的后续任务链。
// 动态执行路径

// 解析条件节点时，根据上下文或任务输出选择合适的分支执行。
// 上下文依赖

// 条件分支可以访问并使用上下文数据，确保动态性和灵活性。

import type { ContextManager } from "./ContextManager";
import type { TaskExecutor } from "./TaskExecutor";
import type { Task } from "./Task";

// 条件分支
export interface ConditionBranch {
  condition: (context: ContextManager) => boolean; // 条件函数
  next: Task | Task[]; // 满足条件时的任务链
}

export interface ConditionNode {
  branches: ConditionBranch[]; // 所有分支
  default?: Task | Task[]; // 默认任务链（当所有条件都不满足时）
}

// 支持顺序,并行任务以及条件分支
type WorkflowStep = Task | Task[] | ConditionNode;

export interface WorkflowDefinition {
  steps: WorkflowStep[];
}

export class WorkflowEngine {
  private executor: TaskExecutor;

  constructor(executor: TaskExecutor) {
    this.executor = executor;
  }

  async run(workflow: WorkflowDefinition): Promise<void> {
    for (const step of workflow.steps) {
      if (Array.isArray(step)) {
        // 并行任务
        await Promise.all(step.map(task => this.runTask(task)));
      } else if (this.isConditionNode(step)) {
        // 条件分支
        await this.handleConditionNode(step as ConditionNode);
      } else {
        // 顺序任务
        await this.runTask(step);
      }
    }
  }

  private async runTask(task: Task): Promise<void> {
    await this.executor.execute(task);
  }

  private async handleConditionNode(node: ConditionNode): Promise<void> {
    const context = this.executor.getContext(); // 获取当前上下文
    for (const branch of node.branches) {
      if (branch.condition(context)) {
        console.log("Condition met, executing branch:", branch.next);
        await this.executeNext(branch.next);
        return;
      }
    }

    // 如果所有条件都不满足，执行默认分支
    if (node.default) {
      console.log("No conditions met, executing default branch:", node.default);
      await this.executeNext(node.default);
    }
  }

  private async executeNext(next: Task | Task[]): Promise<void> {
    if (Array.isArray(next)) {
      await Promise.all(next.map(task => this.runTask(task)));
    } else {
      await this.runTask(next);
    }
  }

  private isConditionNode(step: WorkflowStep): step is ConditionNode {
    return typeof step === "object" && "branches" in step;
  }
}
