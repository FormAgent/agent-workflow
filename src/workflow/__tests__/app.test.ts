import { ContextManager } from "../ContextManager";
import { TaskExecutor } from "../TaskExecutor";
import { WorkflowEngine } from "../Workflow";
import {
  DataCleanTask,
  DefaultTask,
  IntentRecognitionTask,
  WeatherTask,
  workflowDefinition,
} from "./tasks";

describe("顺序任务工作流测试", () => {
  let context: ContextManager;
  let executor: TaskExecutor;
  let engine: WorkflowEngine;

  beforeEach(() => {
    context = new ContextManager();
    executor = new TaskExecutor(context);
    engine = new WorkflowEngine(executor);
  });

  test("可以识别的天气查询", async () => {
    context.set("rawData", "   What's the weather today?   ");
    await engine.run(workflowDefinition);

    const response = context.getAll();
    expect(response.intent).toBe("weather_query");
    expect(response.cleanedData.toLowerCase()).toBe(
      "what's the weather today?",
    );
    expect(response.weatherInfo).toBeDefined();
  });

  test("无法识别的股市查询", async () => {
    context.set("rawData", "   How about the stock market today?   ");
    await engine.run(workflowDefinition);

    const response = context.getAll();
    expect(response.intent).toBe("unknown");
    expect(response.cleanedData.toLowerCase()).toEqual(
      "how about the stock market today?",
    );
    expect(response.defaultResponse).toBeDefined();
  });

  test("空输入处理", async () => {
    context.set("rawData", "");
    await engine.run(workflowDefinition);

    const response = context.getAll();
    expect(response.cleanedData).toBe("");
    expect(response.intent).toBe("unknown");
  });

  test("特殊字符输入处理", async () => {
    context.set("rawData", "  !@#$%^&*()  weather???  ");
    await engine.run(workflowDefinition);

    const response = context.getAll();
    expect(response.cleanedData).toBe("!@#$%^&*() weather???");
    expect(response.intent).toBe("weather_query");
  });

  // test('多个天气相关问题', async () => {
  //   const weatherQueries = [
  //     "What's the weather like?",
  //     "Is it going to rain today?",
  //     "Temperature today?",
  //     "Weather forecast please",
  //   ];

  //   for (const query of weatherQueries) {
  //     context.clear();
  //     context.set("rawData", query);
  //     await engine.run(workflowDefinition);

  //     const response = context.getAll();
  //     expect(response.intent).toBe('weather_query');
  //     expect(response.weatherInfo).toBeDefined();
  //   }
  // });

  // test('任务执行顺序验证', async () => {
  //   const executionOrder: string[] = [];

  //   class OrderTrackingTask extends DataCleanTask {
  //     async execute(input: any) {
  //       executionOrder.push('DataClean');
  //       return super.execute(input);
  //     }
  //   }

  //   class OrderTrackingIntentTask extends IntentRecognitionTask {
  //     async execute(input: any) {
  //       executionOrder.push('IntentRecognition');
  //       return super.execute(input);
  //     }
  //   }

  //   // 重新注册带跟踪的任务
  //   registry.register(new OrderTrackingTask());
  //   registry.register(new OrderTrackingIntentTask());

  //   context.set("rawData", "What's the weather?");
  //   await engine.run(workflowDefinition);

  //   expect(executionOrder).toEqual(['DataClean', 'IntentRecognition']);
  // });

  // test('错误处理 - 数据清理失败', async () => {
  //   class FailingDataCleanTask extends DataCleanTask {
  //     async execute(input: any) {
  //       throw new Error('Data cleaning failed');
  //       return { cleanedData: input };
  //     }
  //   }

  //   registry.register(new FailingDataCleanTask());
  //   context.set("rawData", "Test input");

  //   await expect(engine.run(workflowDefinition)).rejects.toThrow('Data cleaning failed');
  // });

  // test('上下文数据传递', async () => {
  //   class ContextTestTask extends DataCleanTask {
  //     async execute(input: any) {
  //       const result = await super.execute(input);
  //       return { ...result, testData: 'test value' };
  //     }
  //   }

  //   registry.register(new ContextTestTask());
  //   context.set("rawData", "Test input");
  //   await engine.run(workflowDefinition);

  //   expect(context.get('testData')).toBe('test value');
  // });

  // test('并发任务执行', async () => {
  //   const parallelTasks = [
  //     { rawData: "What's the weather?" },
  //     { rawData: "How's the weather today?" },
  //     { rawData: "Is it sunny?" }
  //   ];

  //   const results = await Promise.all(
  //     parallelTasks.map(async (task) => {
  //       const localContext = new ContextManager();
  //       const localExecutor = new TaskExecutor(localContext);
  //       const localEngine = new WorkflowEngine(registry, localExecutor);

  //       localContext.set("rawData", task.rawData);
  //       await localEngine.run(workflowDefinition);
  //       return localContext.getAll();
  //     })
  //   );

  //   results.forEach(response => {
  //     expect(response.intent).toBe('weather_query');
  //     expect(response.weatherInfo).toBeDefined();
  //   });
  // });

  test("长文本输入处理", async () => {
    const longText =
      "This is a very long text that contains multiple sentences. " +
      "Some of them might be about weather like what's the temperature today? " +
      "And some might be about other topics like how's your day going? " +
      "But we're mainly interested in the weather part.";

    context.set("rawData", longText);
    await engine.run(workflowDefinition);

    const response = context.getAll();
    expect(response.cleanedData).toBeDefined();
    expect(response.intent).toBe("weather_query");
  });

  // test('任务注册验证', () => {
  //   const newRegistry = new TaskRegistry();

  //   // 测试重复注册
  //   const task = new DataCleanTask();
  //   newRegistry.register(task);
  //   expect(() => newRegistry.register(task)).toThrow();

  //   // 测试获取不存在的任务
  //   expect(() => newRegistry.getTasks().includes(task)).toThrow();
  // });

  test("上下文管理器操作", () => {
    const testContext = new ContextManager();

    // 测试设置和获取
    testContext.set("test", "value");
    expect(testContext.get("test")).toBe("value");

    // 测试清除
    testContext.clear();
    expect(testContext.get("test")).toBeUndefined();

    // 测试多个值
    testContext.set("key1", "value1");
    testContext.set("key2", "value2");
    const all = testContext.getAll();
    expect(all).toEqual({
      key1: "value1",
      key2: "value2",
    });
  });
});
