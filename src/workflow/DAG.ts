import type { TaskExecutor } from './TaskExecutor';
import type { Task, TaskRegistry } from './TaskRegistry';

export interface DAGTask extends Task {
  dependsOn?: string[]; // 前置任务
}

export interface DAG {
  tasks: DAGTask[];
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class DAGParser {
  static getExecutionOrderWithLevels(dag: DAG): { level: number; tasks: string[] }[] {
    const graph = new Map<string, string[]>(); // 任务图，映射每个任务到其依赖它的任务
    const inDegree = new Map<string, number>(); // 入度表，映射每个任务到其依赖的任务数量
    const levels = new Map<string, number>(); // 每个任务的层级

    // 初始化入度表和图
    for (const task of dag.tasks) {
      inDegree.set(task.name, task.dependsOn ? task.dependsOn.length : 0);
      // 初始化图，映射每个依赖任务到依赖它的任务
      if (task.dependsOn) {
        for (const dependency of task.dependsOn) {
          if (!graph.has(dependency)) {
            graph.set(dependency, []);
          }
          graph.get(dependency)?.push(task.name);
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
        throw new Error("Unexpected empty queue");
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
      throw new Error("Cyclic dependency detected in the task graph");
    }

    // 不再反转结果，保持从低层级到高层级的顺序
    return result;
  }
}


export class DAGWorkflowEngine {
  private taskRegistry: TaskRegistry;
  private executor: TaskExecutor;

  constructor(taskRegistry: TaskRegistry, executor: TaskExecutor) {
    this.taskRegistry = taskRegistry;
    this.executor = executor;
  }

  // 根据任务依赖图执行工作流
  async run(dag: DAG): Promise<void> {
    const levels = DAGParser.getExecutionOrderWithLevels(dag); // 按层解析任务
    for (const { level, tasks } of levels) {
      console.log(`Executing tasks at level ${level}:`, tasks);

      // 同一层级任务并行执行
      await Promise.all(
        tasks.map(async (taskName) => {
          const task = this.taskRegistry.getTask(taskName);
          if (!task) throw new Error(`Task "${taskName}" not found`);
          await this.executor.execute(task);
        })
      );
    }
    console.log("Workflow completed.");
  }
}

