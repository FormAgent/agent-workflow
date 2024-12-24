import { ContextManager } from "../ContextManager";
import { type DAG, DAGParser, DAGWorkflowEngine } from "../DAG";
import type { TaskInput, TaskOutput } from "../Task";
import { TaskExecutor } from "../TaskExecutor";
import { TaskA, TaskB, TaskC, TaskD } from "./dagTasks";

const execute = async (input: TaskInput): Promise<TaskOutput> => {
  return {};
};
{
  const taskA = new TaskA();
  const taskB = new TaskB();
  const taskC = new TaskC();
  const taskD = new TaskD();

  taskB.dependsOn = [taskA];
  taskC.dependsOn = [taskB];
  taskD.dependsOn = [taskA];

  const dag1: DAG = {
    tasks: [taskA, taskB, taskC, taskD],
  };
  console.log(DAGParser.getExecutionOrderWithLevels(dag1)); // 输出: ["TaskA", "TaskB", "TaskC"]
}
{
  const taskA = new TaskA();
  const taskB = new TaskB();
  const taskC = new TaskC();
  const taskD = new TaskD();

  taskB.dependsOn = [taskA];
  taskC.dependsOn = [taskA];
  taskD.dependsOn = [taskB, taskC];

  const dag2: DAG = {
    tasks: [taskA, taskB, taskC, taskD],
  };
  console.log(DAGParser.getExecutionOrderWithLevels(dag2)); // 输出: ["TaskA", "TaskB", "TaskC", "TaskD"]
}

{
  const taskA = new TaskA();
  const taskB = new TaskB();
  const taskC = new TaskC();
  const dag3: DAG = {
    tasks: [taskA, taskB, taskC],
  };
  console.log(DAGParser.getExecutionOrderWithLevels(dag3)); // 输出: ["TaskA", "TaskB", "TaskC"]（顺序可能不同）
}

{
  const taskA = new TaskA();
  const taskB = new TaskB();
  const taskC = new TaskC();

  taskA.dependsOn = [taskC];
  taskB.dependsOn = [taskA];
  taskC.dependsOn = [taskB];
  const dag4: DAG = {
    tasks: [taskA, taskB, taskC],
  };
  try {
    console.log(DAGParser.getExecutionOrderWithLevels(dag4));
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  } catch (error: any) {
    console.error(error.message); // 输出: "Cyclic dependency detected in the task graph"
  }
}

async function main() {
  const context = new ContextManager();
  const executor = new TaskExecutor(context);
  const engine = new DAGWorkflowEngine(executor);

  const taskA = new TaskA();
  const taskB = new TaskB();
  const taskC = new TaskC();
  const taskD = new TaskD();

  taskB.dependsOn = [taskA];
  taskC.dependsOn = [taskB];
  taskD.dependsOn = [taskA];

  const dag: DAG = {
    tasks: [taskA, taskB, taskC, taskD],
  };

  // 运行 DAG 工作流
  await engine.run(dag);
}

main();
