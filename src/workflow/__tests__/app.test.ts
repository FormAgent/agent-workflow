import { DataCleanTask, DefaultTask, IntentRecognitionTask, WeatherTask, workflowDefinition } from "./tasks";
import { ContextManager } from "../ContextManager";
import { TaskExecutor } from "../TaskExecutor";
import { TaskRegistry } from "../TaskRegistry";
import { WorkflowEngine } from "../Workflow";

describe('顺序任务', () => {
  const registry = new TaskRegistry();
  const context = new ContextManager();
  const executor = new TaskExecutor(context);
  const engine = new WorkflowEngine(registry, executor);

  // 注册任务
  registry.register(new DataCleanTask());
  registry.register(new IntentRecognitionTask());
  registry.register(new WeatherTask());
  registry.register(new DefaultTask());

  beforeEach(() => {
  });

  test('可以识别的天气查询', async () => {

    // 设置初始上下文
    context.set("rawData", "   What's the weather today?   ");
  
    // 运行工作流
    await engine.run(workflowDefinition);
  
    // 查看最终上下文
    const response = context.getAll();
    console.log("Final Context:", context.getAll());
    expect(response.intent).toBe('weather_query');
  });

  test('无法识别的股市查询', async () => {
    // 设置初始上下文
    context.set("rawData", "   How about the stock market today?   ");
  
    // 运行工作流
    await engine.run(workflowDefinition);
  
    // 查看最终上下文
    const response = context.getAll();
    console.log("Final Context:", context.getAll());
    expect(response.intent).toBe('unknown');
  });
});