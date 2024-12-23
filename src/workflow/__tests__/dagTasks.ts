import type { DAG, DAGTask } from "../DAG";
import type { TaskInput, TaskOutput } from "../Task";

export class TaskA implements DAGTask {
  name = "TaskA";
  dependsOn = Array<DAGTask>();

  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task A (Data Cleaning)");
    return { cleanedData: "Cleaned Data" };
  }
}

export class TaskB implements DAGTask {
  name = "TaskB";
  dependsOn = Array<DAGTask>(); // 依赖 TaskA

  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task B (Intent Recognition)");
    return { intent: "query" };
  }
}

export class TaskC implements DAGTask {
  name = "TaskC";
  dependsOn = Array<DAGTask>(); // 依赖 TaskB

  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task C (Knowledge Query)");
    return { knowledge: "Knowledge Result" };
  }
}

export class TaskD implements DAGTask {
  name = "TaskD";
  dependsOn = Array<DAGTask>(); // 依赖 TaskA 和 TaskC，但与 TaskB 并行

  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task D (Logging)");
    return { log: "Log Entry" };
  }
}
