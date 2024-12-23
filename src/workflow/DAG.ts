import { ContextManager } from './ContextManager';
import type { TaskExecutor } from './TaskExecutor';
import type { Task, TaskRegistry } from './TaskRegistry';

export interface DAGTask extends Task {
  dependsOn?: string[]; // 前置任务
  branches?: {
    condition: (context: ContextManager) => boolean; // 条件函数
    next: string | string[]; // 满足条件时的后续任务
  }[];
  defaultNext?: string | string[]; // 默认路径（条件不满足时）
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
  ): { level: number; tasks: string[] }[] {
    const graph = new Map<string, string[]>(); // 任务图，映射每个任务到其依赖它的任务
    const inDegree = new Map<string, number>(); // 入度表，映射每个任务到其依赖的任务数量
    const levels = new Map<string, number>(); // 每个任务的层级

    // 初始化图，确保所有任务都有一个入口
    for (const task of dag.tasks) {
      if (!graph.has(task.name)) {
        graph.set(task.name, []);
      }
    }

    // 初始化入度表和构建依赖关系
    for (const task of dag.tasks) {
      inDegree.set(task.name, task.dependsOn ? task.dependsOn.length : 0);
      
      // 处理显式依赖
      if (task.dependsOn) {
        for (const dependency of task.dependsOn) {
          if (!graph.has(dependency)) {
            graph.set(dependency, []);
          }
          graph.get(dependency)?.push(task.name);
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
            graph.get(task.name)?.push(next);
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
          graph.get(task.name)?.push(next);
          const currentDegree = inDegree.get(next) || 0;
          inDegree.set(next, currentDegree + 1);
        }
      }
    }

    // 初始化队列，将入度为0的任务加入队列
    const queue: string[] = [];
    for (const [taskName, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(taskName);
        levels.set(taskName, 0);
      }
    }

    const result: { level: number; tasks: string[] }[] = [];
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
  private executingTasks: Set<string> = new Set();
  private taskStatus: Map<string, TaskStatus> = new Map();
  private skipTasks: Set<string> = new Set();
  private completedTasks: Set<string> = new Set();

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
        tasksToExecute.map(async (taskName) => {
          this.executingTasks.add(taskName);
          try {
            const task = this.taskRegistry.getTask(taskName) as DAGTask;
            if (!task) throw new Error(`Task "${taskName}" not found`);
            
            await this.executor.execute(task);
            this.completedTasks.add(taskName);

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
            this.executingTasks.delete(taskName);
          }
        })
      );
    }
    console.log("Workflow completed.");
  }

  private addOtherBranchesToSkip(task: DAGTask, selectedPath: string | string[]) {
    const selectedTasks = new Set(Array.isArray(selectedPath) ? selectedPath : [selectedPath]);
    
    // 收集所有可能的分支路径
    const allPossibleTasks = new Set<string>();
    
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

  private async executeNext(next: string | string[]): Promise<void> {
    if (Array.isArray(next)) {
      await Promise.all(next.map(taskName => this.runTask(taskName)));
    } else {
      await this.runTask(next);
    }
  }

  private async runTask(taskName: string): Promise<void> {
    if (this.skipTasks.has(taskName) || this.completedTasks.has(taskName)) {
      console.log(`Skipping task ${taskName} as it's either in an unused branch or already completed`);
      return;
    }
    const task = this.taskRegistry.getTask(taskName);
    if (!task) throw new Error(`Task "${taskName}" not found`);
    await this.executor.execute(task);
    this.completedTasks.add(taskName);
  }

  private async updateTaskStatus(taskName: string, status: TaskStatus) {
    this.taskStatus.set(taskName, status);
    // 可以添加状态变更的回调或事件发射
  }

  getTaskStatus(taskName: string): TaskStatus {
    return this.taskStatus.get(taskName) || 'pending';
  }
}
