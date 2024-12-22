import { DataCleanTask, IntentRecognitionTask } from "./tasks";
import { ContextManager } from "./workflow/ContextManager";
import { TaskExecutor } from "./workflow/TaskExecutor";
import { TaskRegistry } from "./workflow/TaskRegistry";
import { WorkflowEngine } from "./workflow/Workflow";

import type { WorkflowDefinition } from "./workflow/Workflow";

export const workflowDefinition: WorkflowDefinition = {
  steps: [
    DataCleanTask.name, // 顺序任务
    [IntentRecognitionTask.name], // 并行任务
  ],
};

async function main() {
  const registry = new TaskRegistry();
  const context = new ContextManager();
  const executor = new TaskExecutor(context);
  const engine = new WorkflowEngine(registry, executor);

  // 注册任务
  registry.register(new DataCleanTask());
  registry.register(new IntentRecognitionTask());

  // 设置初始上下文
  context.set("rawData", "   What is the weather today?   ");

  // 运行工作流
  await engine.run(workflowDefinition);

  // 查看最终上下文
  console.log("Final Context:", context.getAll());
}

main();
