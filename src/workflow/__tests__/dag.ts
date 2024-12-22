import { ContextManager } from "../ContextManager";
import { type DAG, DAGParser, DAGWorkflowEngine } from "../DAG";
import { TaskExecutor } from "../TaskExecutor";
import { type TaskInput, type TaskOutput, TaskRegistry } from "../TaskRegistry";
import { dag, TaskA, TaskB, TaskC, TaskD } from "./dagTasks";

const execute = async (input: TaskInput): Promise<TaskOutput> => { return {}; }
const dag1: DAG = {
  tasks: [
    { name: "TaskA", execute },
    { name: "TaskB", dependsOn: ["TaskA"], execute },
    { name: "TaskC", dependsOn: ["TaskB"], execute },
    { name: "TaskD", dependsOn: ["TaskA"], execute },
  ],
};
console.log(DAGParser.getExecutionOrderWithLevels(dag1)); // 输出: ["TaskA", "TaskB", "TaskC"]

const dag2: DAG = {
  tasks: [
    { name: "TaskA", execute },
    { name: "TaskB", dependsOn: ["TaskA"], execute },
    { name: "TaskC", dependsOn: ["TaskA"], execute },
    { name: "TaskD", dependsOn: ["TaskB", "TaskC"], execute },
  ],
};
console.log(DAGParser.getExecutionOrderWithLevels(dag2)); // 输出: ["TaskA", "TaskB", "TaskC", "TaskD"]

const dag3: DAG = {
  tasks: [
    { name: "TaskA", execute },
    { name: "TaskB" , execute},
    { name: "TaskC", execute },
  ],
};
console.log(DAGParser.getExecutionOrderWithLevels(dag3)); // 输出: ["TaskA", "TaskB", "TaskC"]（顺序可能不同）

const dag4: DAG = {
  tasks: [
    { name: "TaskA", dependsOn: ["TaskC"], execute },
    { name: "TaskB", dependsOn: ["TaskA"], execute },
    { name: "TaskC", dependsOn: ["TaskB"], execute },
  ],
};
try {
  console.log(DAGParser.getExecutionOrderWithLevels(dag4));
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
} catch (error:any) {
  console.error(error.message); // 输出: "Cyclic dependency detected in the task graph"
}

async function main() {
  const registry = new TaskRegistry();
  const context = new ContextManager();
  const executor = new TaskExecutor(context);
  const engine = new DAGWorkflowEngine(registry, executor);

  // 注册任务
  registry.register(new TaskA());
  registry.register(new TaskB());
  registry.register(new TaskC());
  registry.register(new TaskD());

  // 运行 DAG 工作流
  await engine.run(dag);
}

main();
