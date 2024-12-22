import { DataCleanTask, DefaultTask, IntentRecognitionTask, WeatherTask, workflowDefinition } from "./tasks";
import { ContextManager } from "../ContextManager";
import { TaskExecutor } from "../TaskExecutor";
import { TaskRegistry } from "../TaskRegistry";
import { WorkflowEngine } from "../Workflow";

async function main() {
  const registry = new TaskRegistry();
  const context = new ContextManager();
  const executor = new TaskExecutor(context);
  const engine = new WorkflowEngine(registry, executor);

  // 注册任务
  registry.register(new DataCleanTask());
  registry.register(new IntentRecognitionTask());
  registry.register(new WeatherTask());
  registry.register(new DefaultTask());

  // 设置初始上下文
  context.set("rawData", "   What's the weather today?   ");

  // 运行工作流
  await engine.run(workflowDefinition);

  // 查看最终上下文
  console.log("Final Context:", context.getAll());

  // 设置初始上下文
  context.set("rawData", "   How about the stock market today?   ");

  // 运行工作流
  await engine.run(workflowDefinition);

  // 查看最终上下文
  console.log("Final Context:", context.getAll());

}

main();
