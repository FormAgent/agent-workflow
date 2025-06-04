#!/usr/bin/env tsx

import {
  WorkflowBuilder,
  type AISDKStreamingTask,
} from '../src/workflow/WorkflowBuilder';
import type { TaskInput } from '../src/workflow/Task';

/**
 * 🤖 AI SDK 兼容的流式工作流示例
 *
 * 本示例展示：
 * 1. 如何创建AI SDK兼容的流式任务
 * 2. 如何使用buildAISDKStreaming()构建工作流
 * 3. 如何获得与AI SDK相同的API (textStream, toDataStreamResponse等)
 * 4. 如何在Express路由中使用
 */

// 🤖 模拟AI SDK的streamText结果
class MockStreamTextResult {
  constructor(private prompt: string) {}

  async *textStream(): AsyncIterable<string> {
    const responses = [
      `开始分析：${this.prompt}`,
      '检测项目结构...',
      '发现TypeScript配置',
      '分析依赖关系...',
      '生成代码质量报告:',
      '- 整体质量: 良好',
      '- 测试覆盖率: 75%',
      '- 代码重复率: 3%',
      '建议优化点:',
      '1. 增加单元测试',
      '2. 重构重复代码',
      '3. 添加类型注释',
      '分析完成。',
    ];

    for (const response of responses) {
      yield response + '\n';
      await new Promise((resolve) => setTimeout(resolve, 200)); // 模拟流式延迟
    }
  }

  async *fullStream(): AsyncIterable<any> {
    yield { type: 'text-delta', content: `开始分析：${this.prompt}` };
    yield { type: 'text-delta', content: '检测项目结构...' };
    yield { type: 'text-delta', content: '发现TypeScript配置' };
    yield { type: 'tool-call', name: 'codeAnalyzer', args: { path: './src' } };
    yield { type: 'tool-result', result: { files: 45, complexity: 'medium' } };
    yield { type: 'text-delta', content: '生成代码质量报告:' };
    yield { type: 'text-delta', content: '- 整体质量: 良好' };
    yield {
      type: 'finish',
      usage: { prompt_tokens: 150, completion_tokens: 200 },
    };
  }

  toDataStreamResponse(): Response {
    const encoder = new TextEncoder();
    const fullStreamGen = this.fullStream();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of fullStreamGen) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  toReadableStream(): ReadableStream {
    const encoder = new TextEncoder();
    const textStreamGen = this.textStream();

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const textChunk of textStreamGen) {
            controller.enqueue(encoder.encode(textChunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }
}

// 🤖 AI SDK 兼容的代码分析任务
class AICodeAnalysisTask implements AISDKStreamingTask {
  name = 'aiCodeAnalysis';
  isAISDKStreaming = true;

  async execute(input: TaskInput): Promise<Record<string, any>> {
    // 普通执行方法（兼容性）
    return {
      ...input,
      analysis: 'Code analysis completed',
      timestamp: Date.now(),
    };
  }

  async executeStreamAI(input: TaskInput) {
    const prompt = `分析代码项目: ${input.projectPath || './src'}`;
    const streamResult = new MockStreamTextResult(prompt);

    return {
      textStream: streamResult.textStream(),
      fullStream: streamResult.fullStream(),
      toDataStreamResponse: () => streamResult.toDataStreamResponse(),
      toReadableStream: () => streamResult.toReadableStream(),
    };
  }
}

// 🤖 AI 文档生成任务
class AIDocumentationTask implements AISDKStreamingTask {
  name = 'aiDocumentation';
  isAISDKStreaming = true;

  async execute(input: TaskInput): Promise<Record<string, any>> {
    return {
      ...input,
      documentation: 'Documentation generated',
      timestamp: Date.now(),
    };
  }

  async executeStreamAI(input: TaskInput) {
    const prompt = `为项目生成文档: ${input.projectPath || './src'}`;
    const streamResult = new MockStreamTextResult(prompt);

    return {
      textStream: streamResult.textStream(),
      fullStream: streamResult.fullStream(),
      toDataStreamResponse: () => streamResult.toDataStreamResponse(),
      toReadableStream: () => streamResult.toReadableStream(),
    };
  }
}

// 📊 普通状态任务（用于对比）
class StatusTask implements AISDKStreamingTask {
  name = 'statusTask';
  isAISDKStreaming = false; // 不是AI流式任务

  async execute(input: TaskInput): Promise<Record<string, any>> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      ...input,
      status: 'Project setup completed',
      timestamp: Date.now(),
    };
  }
}

// 🚀 主函数 - 运行AI SDK兼容的流式工作流示例
async function runAISDKStreamingExample() {
  console.log('🤖 AI SDK 兼容的流式工作流示例\n');

  try {
    // 1. 创建AI SDK兼容的流式工作流
    const aiStreamingWorkflow = WorkflowBuilder.create()
      .addTask(new StatusTask()) // 普通任务
      .addTask(new AICodeAnalysisTask()) // AI流式任务
      .addTask(new AIDocumentationTask()) // AI流式任务
      .buildAISDKStreaming(); // 🔥 使用AI SDK兼容构建

    console.log('🌊 方式1: 使用textStream - 纯文本流');
    console.log('='.repeat(50));

    const streamResult = aiStreamingWorkflow.executeStreamAISDK({
      projectPath: './my-awesome-project',
      framework: 'typescript',
    });

    // 消费文本流（类似AI SDK的textStream）
    for await (const textChunk of streamResult.textStream) {
      process.stdout.write(textChunk);
    }

    console.log('\n\n🔄 方式2: 使用fullStream - 结构化数据流');
    console.log('='.repeat(50));

    const streamResult2 = aiStreamingWorkflow.executeStreamAISDK({
      projectPath: './my-awesome-project',
      framework: 'typescript',
    });

    // 消费完整数据流（类似AI SDK的fullStream）
    for await (const dataChunk of streamResult2.fullStream) {
      console.log('📦 数据块:', JSON.stringify(dataChunk, null, 2));
    }

    console.log('\n\n📡 方式3: 获取ReadableStream - 直接返回给前端');
    console.log('='.repeat(50));

    const streamResult3 = aiStreamingWorkflow.executeStreamAISDK({
      projectPath: './my-awesome-project',
      framework: 'typescript',
    });

    // 获取ReadableStream（可以直接返回给前端）
    const readableStream = streamResult3.toReadableStream();
    console.log('✅ ReadableStream 已创建，可以直接返回给前端');
    console.log('   类型:', readableStream.constructor.name);

    // 获取DataStreamResponse（SSE格式）
    const dataStreamResponse = streamResult3.toDataStreamResponse();
    console.log('✅ DataStreamResponse 已创建，可用于SSE');
    console.log('   Status:', dataStreamResponse.status);
    console.log(
      '   Headers:',
      Object.fromEntries(dataStreamResponse.headers.entries())
    );

    // 获取最终结果
    const finalResult = await streamResult3.getResult();
    console.log('\n📊 最终工作流结果:');
    console.log('   成功:', finalResult.success);
    console.log('   执行时间:', finalResult.executionTime + 'ms');
    console.log('   任务数量:', finalResult.taskResults.size);

    console.log('\n🎯 Express 路由集成示例:');
    console.log('='.repeat(50));

    // 展示如何在Express中使用
    const expressExample = `
// Express 路由示例
app.post('/api/ai/analyze', async (req, res) => {
  const workflow = WorkflowBuilder
    .create()
    .addTask(new AICodeAnalysisTask())
    .addTask(new AIDocumentationTask())
    .buildAISDKStreaming();

  const streamResult = workflow.executeStreamAISDK(req.body);
  
  // 方式1: 返回纯文本流
  if (req.headers.accept === 'text/plain') {
    const readableStream = streamResult.toReadableStream();
    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // 方式2: 返回SSE数据流（推荐）
  return streamResult.toDataStreamResponse();
});

// 前端消费示例 (React)
const handleAnalyze = async () => {
  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ projectPath: './src' })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        console.log('AI数据:', data);
      }
    }
  }
};
    `.trim();

    console.log(expressExample);
  } catch (error) {
    console.error('💥 AI SDK流式工作流执行异常:', error);
  }
}

// 🚀 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎯 本示例展示如何创建与AI SDK完全兼容的流式工作流\n');
  runAISDKStreamingExample().catch(console.error);
}

export { runAISDKStreamingExample, AICodeAnalysisTask, AIDocumentationTask };
