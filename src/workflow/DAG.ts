import { ContextManager } from './ContextManager';
import type { TaskExecutor } from './TaskExecutor';
import type { Task, TaskRegistry } from './TaskRegistry';

export interface DAGTask extends Task {
  dependsOn?: DAGTask[]; // 前置任务
  branches?: {
    condition: (context: ContextManager) => boolean; // 条件函数
    next: DAGTask | DAGTask[]; // 满足条件时的后续任务
  }[];
  defaultNext?: DAGTask | DAGTask[]; // 默认路径（条件不满足时）
  onError?: (error: Error, context: ContextManager) => Promise<void>;
  retryCount?: number;
}

export interface DAG {
  tasks: DAGTask[];
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class DAGParser {
  static getExecutionOrderWithLevels(
    dag: DAG
  ): { level: number; tasks: DAGTask[] }[] {
    const graph = new Map<DAGTask, DAGTask[]>(); // 邻接表：任务图
    const inDegree = new Map<DAGTask, number>(); // 入度表：记录任务的依赖数量
    const levels = new Map<DAGTask, number>(); // 每个任务的层级

    // 初始化图，确保所有任务都有一个入口
    for (const task of dag.tasks) {
      if (!graph.has(task)) {
        graph.set(task, []);
      }
    }

    // 初始化入度表和构建依赖关系
    for (const task of dag.tasks) {
      inDegree.set(task, task.dependsOn ? task.dependsOn.length : 0);
      
      // 处理显式依赖
      if (task.dependsOn) {
        for (const dependency of task.dependsOn) {
          if (!graph.has(dependency)) {
            graph.set(dependency, []);
          }
          graph.get(dependency)?.push(task);
        }
      }

      // 处理条件分支依赖
      if (task.branches) {
        for (const branch of task.branches) {
          const nextTasks = Array.isArray(branch.next)
            ? branch.next
            : [branch.next];
          for (const next of nextTasks) {
            if (!graph.has(next)) {
              graph.set(next, []);
            }
            // 维持原来的依赖方向：next 任务依赖于当前任务
            graph.get(task)?.push(next);
            const currentDegree = inDegree.get(next) || 0;
            inDegree.set(next, currentDegree + 1);
          }
        }
      }

      // 处理默认路径依赖
      if (task.defaultNext) {
        const defaultTasks = Array.isArray(task.defaultNext)
          ? task.defaultNext
          : [task.defaultNext];
        for (const next of defaultTasks) {
          if (!graph.has(next)) {
            graph.set(next, []);
          }
          // 维持原来的依赖方向：next 任务依赖于当前任务
          graph.get(task)?.push(next);
          const currentDegree = inDegree.get(next) || 0;
          inDegree.set(next, currentDegree + 1);
        }
      }
    }

    // 初始化队列，将入度为0的任务加入队列
    const queue: DAGTask[] = [];
    for (const [task, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(task);
        levels.set(task, 0);
      }
    }

    const result: { level: number; tasks: DAGTask[] }[] = [];
    while (queue.length > 0) {
      const taskName = queue.shift();
      if (!taskName) {
        throw new Error('Unexpected empty queue');
      }
      const currentLevel = levels.get(taskName);
      if (currentLevel === undefined) {
        throw new Error(`Level for task "${taskName}" not found`);
      }

      if (!result[currentLevel]) {
        result[currentLevel] = { level: currentLevel, tasks: [] };
      }
      result[currentLevel].tasks.push(taskName);

      // 遍历所有依赖于当前任务的任务
      for (const dependent of graph.get(taskName) || []) {
        const dependentInDegree = inDegree.get(dependent);
        if (dependentInDegree !== undefined) {
          inDegree.set(dependent, dependentInDegree - 1);
        }
        if (inDegree.get(dependent) === 0) {
          queue.push(dependent);
          levels.set(dependent, currentLevel + 1);
        }
      }
    }

    // 检查循环依赖
    if (levels.size !== dag.tasks.length) {
      throw new Error('Cyclic dependency detected in the task graph');
    }

    // 不再反转结果，保持从低层级到高层级的顺序
    return result;
  }
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export class DAGWorkflowEngine {
  private taskRegistry: TaskRegistry;
  private executor: TaskExecutor;
  private executingTasks: Set<DAGTask> = new Set();
  private taskStatus: Map<DAGTask, TaskStatus> = new Map();
  private skipTasks: Set<DAGTask> = new Set();
  private completedTasks: Set<DAGTask> = new Set();

  constructor(taskRegistry: TaskRegistry, executor: TaskExecutor) {
    this.taskRegistry = taskRegistry;
    this.executor = executor;
  }

  async run(dag: DAG): Promise<void> {
    const levels = DAGParser.getExecutionOrderWithLevels(dag);
    this.skipTasks.clear();
    this.completedTasks.clear();

    for (const { level, tasks } of levels) {
      console.log(`Executing tasks at level ${level}:`, tasks);

      // 过滤掉已执行、已完成和需要跳过的任务
      const tasksToExecute = tasks.filter(
        task => !this.executingTasks.has(task) && 
                !this.skipTasks.has(task) && 
                !this.completedTasks.has(task)
      );
      
      await Promise.all(
        tasksToExecute.map(async (task) => {
          this.executingTasks.add(task);
          try {
           
            await this.executor.execute(task);
            this.completedTasks.add(task);

            if (task.branches) {
              let branchTaken = false;
              for (const branch of task.branches) {
                if (branch.condition(this.executor.getContext())) {
                  console.log(`Condition met for branch, executing next tasks:`, branch.next);
                  this.addOtherBranchesToSkip(task, branch.next);
                  await this.executeNext(branch.next);
                  branchTaken = true;
                  break;
                }
              }
              if (!branchTaken && task.defaultNext) {
                console.log(`No conditions met, executing default tasks:`, task.defaultNext);
                this.addOtherBranchesToSkip(task, task.defaultNext);
                await this.executeNext(task.defaultNext);
              }
            }
          } finally {
            this.executingTasks.delete(task);
          }
        })
      );
    }
    console.log("Workflow completed.");
  }

  private addOtherBranchesToSkip(task: DAGTask, selectedPath: DAGTask | DAGTask[]) {
    const selectedTasks = new Set(Array.isArray(selectedPath) ? selectedPath : [selectedPath]);
    
    // 收集所有可能的分支路径
    const allPossibleTasks = new Set<DAGTask>();
    
    // 添加所有条件分支的目标任务
    task.branches?.forEach(branch => {
      const nextTasks = Array.isArray(branch.next) ? branch.next : [branch.next];
      nextTasks.forEach(t => allPossibleTasks.add(t));
    });
    
    // 添加默认分支的目标任务
    if (task.defaultNext) {
      const defaultTasks = Array.isArray(task.defaultNext) 
        ? task.defaultNext 
        : [task.defaultNext];
      defaultTasks.forEach(t => allPossibleTasks.add(t));
    }
    
    // 将未选中的分支添加到跳过列表
    allPossibleTasks.forEach(t => {
      if (!selectedTasks.has(t)) {
        this.skipTasks.add(t);
      }
    });
  }

  private async executeNext(next: DAGTask | DAGTask[]): Promise<void> {
    if (Array.isArray(next)) {
      await Promise.all(next.map(task => this.runTask(task)));
    } else {
      await this.runTask(next);
    }
  }

  private async runTask(task: DAGTask): Promise<void> {
    if (this.skipTasks.has(task) || this.completedTasks.has(task)) {
      console.log(`Skipping task ${task} as it's either in an unused branch or already completed`);
      return;
    }
    await this.executor.execute(task);
    this.completedTasks.add(task);
  }

  private async updateTaskStatus(task: DAGTask, status: TaskStatus) {
    this.taskStatus.set(task, status);
    // 可以添加状态变更的回调或事件发射
  }

  getTaskStatus(task: DAGTask): TaskStatus {
    return this.taskStatus.get(task) || 'pending';
  }
}
