import { ContextManager } from "../ContextManager";
import { type DAG, DAGParser, DAGTask, DAGWorkflowEngine } from "../DAG";
import { TaskExecutor } from "../TaskExecutor";
import { type TaskInput, type TaskOutput, TaskRegistry } from "../TaskRegistry";

class TaskA implements DAGTask {
  name = "TaskA";
  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task A");
    return {...input};
  }
}

class TaskB implements DAGTask {
  name = "TaskB";
  dependsOn = ["ConditionalTask"];
  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task B");
    return {};
  }
}

class TaskC implements DAGTask {
  name = "TaskC";
  dependsOn = ["ConditionalTask"];
  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task C");
    return {};
  }
}

class ConditionalTask implements DAGTask {
  name = "ConditionalTask";
  dependsOn = ["TaskA"];
  branches = [
    { condition: (ctx: ContextManager) => ctx.get("value") > 5, next: "TaskB" },
    { condition: (ctx: ContextManager) => ctx.get("value") <= 5, next: "TaskC" },
  ];
  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing ConditionalTask");
    return {};
  }
}

const dagWithSwitch: DAG = {
  tasks: [
    new TaskA(),
    new ConditionalTask(),
    new TaskB(),
    new TaskC(),
  ],
};

async function main() {
  const registry = new TaskRegistry();
  const context = new ContextManager();
  const executor = new TaskExecutor(context);
  const engine = new DAGWorkflowEngine(registry, executor);

  console.log(DAGParser.getExecutionOrderWithLevels(dagWithSwitch)); 

  // 注册任务
  dagWithSwitch.tasks.forEach((task) => registry.register(task));

  // 设置初始上下文
  context.set("value", 5); // 改变此值以测试条件

  // 运行工作流
  await engine.run(dagWithSwitch);
}

main();
