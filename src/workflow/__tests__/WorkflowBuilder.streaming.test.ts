import { beforeEach, describe, expect, it } from "@jest/globals";
import type { TaskInput } from "../Task";
import {
  type AISDKStreamingTask,
  type DAGTask,
  type StreamChunk,
  type StreamingDAGTask,
  WorkflowBuilder,
} from "../WorkflowBuilder";

// 🌊 流式任务实现
class MockStreamingTask implements StreamingDAGTask {
  constructor(
    public name: string,
    private outputs: string[] = [],
    private finalOutput: Record<string, any> = {},
    public dependsOn: DAGTask[] = [],
  ) {}

  isStreaming = true;

  async execute(input: TaskInput): Promise<Record<string, any>> {
    return { ...input, [this.name]: this.finalOutput };
  }

  async *executeStream(
    input: TaskInput,
  ): AsyncGenerator<StreamChunk, Record<string, any>, unknown> {
    for (const output of this.outputs) {
      yield {
        type: "data",
        taskName: this.name,
        content: output,
        timestamp: Date.now(),
      };
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    return { ...input, [this.name]: this.finalOutput };
  }
}

// 🤖 AI SDK 兼容流式任务
class MockAISDKStreamingTask implements AISDKStreamingTask {
  constructor(
    public name: string,
    private textChunks: string[] = [],
    private finalData: Record<string, any> = {},
    public dependsOn: DAGTask[] = [],
  ) {}

  isAISDKStreaming = true;

  async execute(input: TaskInput): Promise<Record<string, any>> {
    return { ...input, [this.name]: this.finalData };
  }

  async executeStreamAI(input: TaskInput) {
    const self = this;

    const textStream = async function* (): AsyncGenerator<
      string,
      void,
      unknown
    > {
      for (const chunk of self.textChunks) {
        yield chunk;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    };

    const fullStream = async function* (): AsyncGenerator<any, void, unknown> {
      for (let i = 0; i < self.textChunks.length; i++) {
        yield {
          type: "text-chunk",
          content: self.textChunks[i],
          index: i,
          total: self.textChunks.length,
        };
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      yield {
        type: "complete",
        data: self.finalData,
      };
    };

    return {
      textStream: textStream(),
      fullStream: fullStream(),

      toDataStreamResponse() {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for (const chunk of self.textChunks) {
                const data = `data: ${JSON.stringify({
                  type: "text",
                  content: chunk,
                })}\n\n`;
                controller.enqueue(encoder.encode(data));
                await new Promise((resolve) => setTimeout(resolve, 5));
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },

      toReadableStream() {
        const encoder = new TextEncoder();
        return new ReadableStream({
          async start(controller) {
            try {
              for (const chunk of self.textChunks) {
                controller.enqueue(encoder.encode(chunk));
                await new Promise((resolve) => setTimeout(resolve, 5));
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });
      },
    };
  }
}

// 非流式任务（用于混合测试）
class MockNormalTask implements DAGTask {
  constructor(
    public name: string,
    private output: Record<string, any> = {},
    public dependsOn: DAGTask[] = [],
  ) {}

  async execute(input: TaskInput): Promise<Record<string, any>> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { ...input, [this.name]: this.output };
  }
}

describe("WorkflowBuilder 流式功能测试", () => {
  describe("🌊 基础流式工作流", () => {
    it("应该能构建和执行流式工作流", async () => {
      const streamingTask = new MockStreamingTask(
        "analysis",
        ["开始分析...", "处理数据...", "生成报告..."],
        { result: "analysis_complete" },
      );

      const workflow = WorkflowBuilder.create()
        .addTask(streamingTask)
        .buildStreaming();

      expect(workflow).toBeDefined();
      expect(typeof workflow.executeStream).toBe("function");
    });

    it("应该正确处理流式任务的输出", async () => {
      const streamingTask = new MockStreamingTask(
        "streaming_analysis",
        ["🔍 开始扫描...", "📊 分析数据...", "✅ 完成分析"],
        { analysisResult: "complete", issues: 3 },
      );

      const workflow = WorkflowBuilder.create()
        .addTask(streamingTask)
        .buildStreaming();

      const streamResult = workflow.executeStream({ input: "test_data" });
      const chunks: any[] = [];

      for await (const chunk of streamResult.stream) {
        chunks.push(chunk);
      }

      const finalResult = await streamResult.getResult();

      expect(chunks.length).toBeGreaterThan(0);
      expect(
        chunks.some((c) => c.type === "data" && c.content === "🔍 开始扫描..."),
      ).toBe(true);
      expect(
        chunks.some(
          (c) => c.type === "complete" && c.taskName === "streaming_analysis",
        ),
      ).toBe(true);

      expect(finalResult.success).toBe(true);
      expect(finalResult.data?.streaming_analysis?.analysisResult).toBe(
        "complete",
      );
    });

    it("应该支持混合流式和非流式任务", async () => {
      const normalTask = new MockNormalTask("setup", { initialized: true });
      const streamingTask = new MockStreamingTask(
        "process",
        ["处理步骤1", "处理步骤2"],
        { processed: true },
        [normalTask],
      );

      const workflow = WorkflowBuilder.create()
        .addTask(normalTask)
        .addTask(streamingTask)
        .buildStreaming();

      const streamResult = workflow.executeStream();
      const chunks: any[] = [];

      for await (const chunk of streamResult.stream) {
        chunks.push(chunk);
      }

      const finalResult = await streamResult.getResult();

      expect(finalResult.success).toBe(true);
      expect(finalResult.taskResults.size).toBeGreaterThanOrEqual(2);
      expect(chunks.some((c) => c.taskName === "setup")).toBe(true);
      expect(chunks.some((c) => c.taskName === "process")).toBe(true);
    });

    it("应该正确处理流式任务的错误", async () => {
      class FailingStreamingTask extends MockStreamingTask {
        async *executeStream(
          input: TaskInput,
        ): AsyncGenerator<StreamChunk, Record<string, any>, unknown> {
          yield {
            type: "data",
            taskName: this.name,
            content: "开始处理...",
            timestamp: Date.now(),
          };
          yield {
            type: "data",
            taskName: this.name,
            content: "出现错误...",
            timestamp: Date.now(),
          };
          throw new Error("流式任务执行失败");
        }
      }

      const failingTask = new FailingStreamingTask("failing_stream", [], {});

      const workflow = WorkflowBuilder.create()
        .addTask(failingTask)
        .buildStreaming();

      const streamResult = workflow.executeStream();
      const chunks: any[] = [];

      try {
        for await (const chunk of streamResult.stream) {
          chunks.push(chunk);
        }
      } catch (error) {
        // 流式执行中的错误可能在这里被捕获
      }

      const finalResult = await streamResult.getResult();

      const hasErrorChunk = chunks.some((c) => c.type === "error");
      const resultHasError = !finalResult.success;

      expect(hasErrorChunk || resultHasError).toBe(true);
    });
  });

  describe("🤖 AI SDK 兼容流式工作流", () => {
    it("应该能构建AI SDK兼容的流式工作流", async () => {
      const aiTask = new MockAISDKStreamingTask(
        "ai_analysis",
        ["分析中...", "生成建议...", "完成"],
        { aiResult: "analysis_done" },
      );

      const workflow = WorkflowBuilder.create()
        .addTask(aiTask)
        .buildAISDKStreaming();

      expect(workflow).toBeDefined();
      expect(typeof workflow.executeStreamAISDK).toBe("function");
    });

    it("应该提供AI SDK兼容的流式接口", async () => {
      const aiTask = new MockAISDKStreamingTask(
        "ai_generation",
        ["生成内容...", "优化文本...", "最终检查..."],
        { generatedContent: "AI generated text" },
      );

      const workflow = WorkflowBuilder.create()
        .addTask(aiTask)
        .buildAISDKStreaming();

      const streamResult = workflow.executeStreamAISDK({
        prompt: "Generate content",
      });

      const textChunks: string[] = [];
      for await (const chunk of streamResult.textStream) {
        textChunks.push(chunk);
      }
      expect(textChunks).toEqual(["生成内容...", "优化文本...", "最终检查..."]);

      const streamResult2 = workflow.executeStreamAISDK({
        prompt: "Generate content",
      });
      const fullChunks: any[] = [];
      for await (const chunk of streamResult2.fullStream) {
        fullChunks.push(chunk);
      }
      expect(fullChunks.length).toBeGreaterThan(0);
      expect(
        fullChunks.some(
          (c) => c.type === "ai-chunk" && c.data?.type === "text-chunk",
        ),
      ).toBe(true);
    });

    it("应该支持toDataStreamResponse方法", async () => {
      const aiTask = new MockAISDKStreamingTask(
        "ai_response",
        ["Hello", " world", "!"],
        { response: "complete" },
      );

      const workflow = WorkflowBuilder.create()
        .addTask(aiTask)
        .buildAISDKStreaming();

      const streamResult = workflow.executeStreamAISDK();
      const response = streamResult.toDataStreamResponse();

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    });

    it("应该支持toReadableStream方法", async () => {
      const aiTask = new MockAISDKStreamingTask(
        "ai_stream",
        ["Chunk1", "Chunk2", "Chunk3"],
        { streamComplete: true },
      );

      const workflow = WorkflowBuilder.create()
        .addTask(aiTask)
        .buildAISDKStreaming();

      const streamResult = workflow.executeStreamAISDK();
      const readableStream = streamResult.toReadableStream();

      expect(readableStream).toBeInstanceOf(ReadableStream);
    });

    it("应该处理混合AI SDK和非AI SDK任务", async () => {
      const normalTask = new MockNormalTask("prepare", { ready: true });
      const aiTask = new MockAISDKStreamingTask(
        "ai_process",
        ["AI处理中...", "生成结果..."],
        { aiProcessed: true },
        [normalTask],
      );
      const finalTask = new MockNormalTask("finalize", { done: true }, [
        aiTask,
      ]);

      const workflow = WorkflowBuilder.create()
        .addTask(normalTask)
        .addTask(aiTask)
        .addTask(finalTask)
        .buildAISDKStreaming();

      const streamResult = workflow.executeStreamAISDK();
      const finalResult = await streamResult.getResult();

      expect(finalResult.success).toBe(true);
      expect(finalResult.taskResults.size).toBe(3);
      expect(finalResult.data?.prepare?.ready).toBe(true);
      expect(finalResult.data?.ai_process?.aiProcessed).toBe(true);
      expect(finalResult.data?.finalize?.done).toBe(true);
    });
  });

  describe("🎯 流式动态策略工作流", () => {
    it("应该支持基于流式任务结果的动态生成", async () => {
      const streamingAnalysis = new MockStreamingTask(
        "streaming_analysis",
        ["分析安全性...", "检查性能..."],
        { issues: ["security", "performance"] },
      );

      const securityFix = new MockNormalTask("security_fix", { fixed: true });
      const perfOptimization = new MockNormalTask("perf_optimization", {
        optimized: true,
      });

      const workflow = WorkflowBuilder.create()
        .addTask(streamingAnalysis)
        .onTaskComplete("streaming_analysis", async (result, context) => {
          const tasks: DAGTask[] = [];
          const analysisData = result?.streaming_analysis || result;
          const issues = analysisData?.issues || [];

          if (issues.includes("security")) {
            tasks.push(securityFix);
          }
          if (issues.includes("performance")) {
            tasks.push(perfOptimization);
          }

          return tasks;
        })
        .buildStreaming();

      const streamResult = workflow.executeStream();
      const chunks: any[] = [];

      for await (const chunk of streamResult.stream) {
        chunks.push(chunk);
      }

      const finalResult = await streamResult.getResult();

      expect(finalResult.success).toBe(true);
      expect(finalResult.dynamicTasksGenerated).toBe(2);
      expect(finalResult.taskResults.has("security_fix")).toBe(true);
      expect(finalResult.taskResults.has("perf_optimization")).toBe(true);
    });

    it("应该支持流式任务的条件策略", async () => {
      const triggerTask = new MockStreamingTask(
        "trigger_stream",
        ["检查条件...", "满足条件"],
        { shouldProcess: true },
      );

      const conditionalTask = new MockNormalTask("conditional_task", {
        executed: true,
      });

      const workflow = WorkflowBuilder.create()
        .addTask(triggerTask)
        .whenCondition(
          (context) => {
            const triggerData = context.get("trigger_stream") as any;
            return triggerData?.shouldProcess === true;
          },
          async () => [conditionalTask],
        )
        .buildStreaming();

      const streamResult = workflow.executeStream();
      const finalResult = await streamResult.getResult();

      expect(finalResult.success).toBe(true);
      expect(finalResult.dynamicTasksGenerated).toBe(1);
      expect(finalResult.taskResults.has("conditional_task")).toBe(true);
    });
  });

  describe("📊 流式进度和监控", () => {
    it("应该提供详细的流式进度信息", async () => {
      const task1 = new MockStreamingTask("step1", ["步骤1开始"], {
        step1: "done",
      });
      const task2 = new MockStreamingTask("step2", ["步骤2开始"], {
        step2: "done",
      });

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .addTask(task2)
        .buildStreaming();

      const streamResult = workflow.executeStream();
      const progressChunks: any[] = [];

      for await (const chunk of streamResult.stream) {
        if (chunk.type === "progress") {
          progressChunks.push(chunk);
        }
      }

      expect(progressChunks.length).toBeGreaterThan(0);
      expect(progressChunks.some((c) => c.progress === 0)).toBe(true);
      expect(progressChunks.some((c) => c.progress === 100)).toBe(true);
    });

    it("应该正确跟踪流式执行时间", async () => {
      const streamingTask = new MockStreamingTask("timed_task", ["处理中..."], {
        result: "done",
      });

      const workflow = WorkflowBuilder.create()
        .addTask(streamingTask)
        .buildStreaming();

      const startTime = Date.now();
      const streamResult = workflow.executeStream();

      for await (const chunk of streamResult.stream) {
        // 处理流式输出
      }

      const finalResult = await streamResult.getResult();
      const endTime = Date.now();

      expect(finalResult.executionTime).toBeGreaterThan(0);
      expect(finalResult.executionTime).toBeLessThanOrEqual(
        endTime - startTime + 100,
      );
    });
  });

  describe("🔧 边界情况和错误处理", () => {
    it("应该处理空的流式工作流", async () => {
      const workflow = WorkflowBuilder.create().buildStreaming();

      const streamResult = workflow.executeStream();
      const chunks: any[] = [];

      for await (const chunk of streamResult.stream) {
        chunks.push(chunk);
      }

      const finalResult = await streamResult.getResult();

      expect(finalResult.success).toBe(true);
      expect(finalResult.taskResults.size).toBe(0);
      expect(chunks.some((c) => c.type === "complete")).toBe(true);
    });

    it("应该处理流式任务中的异步生成器错误", async () => {
      class ErrorStreamingTask extends MockStreamingTask {
        async *executeStream(
          input: TaskInput,
        ): AsyncGenerator<StreamChunk, Record<string, any>, unknown> {
          yield {
            type: "data",
            taskName: this.name,
            content: "正常输出",
            timestamp: Date.now(),
          };
          throw new Error("生成器内部错误");
        }
      }

      const errorTask = new ErrorStreamingTask("error_task", [], {});

      const workflow = WorkflowBuilder.create()
        .addTask(errorTask)
        .buildStreaming();

      const streamResult = workflow.executeStream();
      const errorChunks: any[] = [];

      for await (const chunk of streamResult.stream) {
        if (chunk.type === "error") {
          errorChunks.push(chunk);
        }
      }

      expect(errorChunks.length).toBeGreaterThan(0);
      expect(errorChunks[0].content).toContain("生成器内部错误");
    });

    it("应该处理AI SDK流式任务的错误", async () => {
      class ErrorAISDKTask extends MockAISDKStreamingTask {
        async executeStreamAI(input: TaskInput) {
          const textStreamGen = async function* (): AsyncGenerator<
            string,
            void,
            unknown
          > {
            yield "Normal output";
            throw new Error("AI SDK stream error");
          };

          const fullStreamGen = async function* (): AsyncGenerator<
            any,
            void,
            unknown
          > {
            throw new Error("Full stream error");
          };

          return {
            textStream: textStreamGen(),
            fullStream: fullStreamGen(),
            toDataStreamResponse: () => new Response("error"),
            toReadableStream: () => new ReadableStream(),
          };
        }
      }

      const errorAITask = new ErrorAISDKTask("error_ai_task", [], {});

      const workflow = WorkflowBuilder.create()
        .addTask(errorAITask)
        .buildAISDKStreaming();

      const streamResult = workflow.executeStreamAISDK();

      try {
        const chunks: string[] = [];
        for await (const chunk of streamResult.textStream) {
          chunks.push(chunk);
        }
        expect(chunks).toContain("Normal output");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("AI SDK stream error");
      }
    });
  });
});
