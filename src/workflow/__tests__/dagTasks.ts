import type { DAG, DAGTask } from "../DAG";
import type { TaskInput, TaskOutput } from "../TaskRegistry";

export class TaskA implements DAGTask {
  name = "TaskA";

  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task A (Data Cleaning)");
    return { cleanedData: "Cleaned Data" };
  }
}

export class TaskB implements DAGTask {
  name = "TaskB";
  dependsOn = ["TaskA"]; // 依赖 TaskA

  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task B (Intent Recognition)");
    return { intent: "query" };
  }
}
export class TaskC implements DAGTask {
  name = "TaskC";
  dependsOn = ["TaskB"]; // 依赖 TaskB

  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task C (Knowledge Query)");
    return { knowledge: "Knowledge Result" };
  }
}

export class TaskD implements DAGTask {
  name = "TaskD";
  dependsOn = ["TaskA"]; // 依赖 TaskA，但与 TaskB 和 TaskC 并行

  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task D (Logging)");
    return { log: "Log Entry" };
  }
}

//定义任务依赖图
export const dag: DAG = {
  tasks: [
    new TaskA(),
    new TaskB(),
    new TaskC(),
    new TaskD(),
  ],
};
