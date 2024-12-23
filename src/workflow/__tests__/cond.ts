import { ContextManager } from "../ContextManager";
import type { DAG, DAGParser, DAGTask, DAGWorkflowEngine } from "../DAG";
import { TaskExecutor } from "../TaskExecutor";
import type { TaskInput, TaskOutput } from "../Task";

class TaskA implements DAGTask {
  name = "TaskA";
  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task A");
    return {...input};
  }
}

class TaskB implements DAGTask {
  name = "TaskB";
  dependsOn: DAGTask[] = [];
  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task B");
    return {};
  }
}

class TaskC implements DAGTask {
  name = "TaskC";
  dependsOn: DAGTask[] = [];
  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing Task C");
    return {};
  }
}

class ConditionalTask implements DAGTask {
  name = "ConditionalTask";
  dependsOn: DAGTask[] = [];
  branches: { condition: (ctx: ContextManager) => boolean; next: DAGTask | DAGTask[] }[] = [];
  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("Executing ConditionalTask");
    return {};
  }
}

const taskA = new TaskA();
const conditionalTask = new ConditionalTask();
const taskB = new TaskB();
const taskC = new TaskC();

conditionalTask.branches = [
  { condition: (ctx: ContextManager) => ctx.get("value") > 5, next: taskB },
  { condition: (ctx: ContextManager) => ctx.get("value") <= 5, next: taskC },
];

conditionalTask.dependsOn = [taskA];
taskB.dependsOn = [conditionalTask];
taskC.dependsOn = [conditionalTask];

const dagWithSwitch: DAG = {
  tasks: [
    taskA,
    conditionalTask,
    taskB,
    taskC,
  ],
};

async function main() {
  const context = new ContextManager();
  const executor = new TaskExecutor(context);
  const engine = new DAGWorkflowEngine(executor);

  console.log(DAGParser.getExecutionOrderWithLevels(dagWithSwitch)); 

  // 设置初始上下文
  context.set("value", 5); // 改变此值以测试条件

  // 运行工作流
  await engine.run(dagWithSwitch);
}

main();
