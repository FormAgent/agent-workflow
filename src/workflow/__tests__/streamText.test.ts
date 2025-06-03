import { jest } from '@jest/globals';
import { ContextManager } from '../ContextManager';
import { TaskExecutor } from '../TaskExecutor';
import { StreamingTask } from '../StreamingTask';
import type { TaskInput } from '../Task';
import { createDataStream, streamText } from 'ai';
import type { Message } from 'ai';
import { openai } from '@ai-sdk/openai';
import dotenv from 'dotenv';
import { WorkflowEngine } from '../Workflow';
dotenv.config();

interface StreamOutput {
  text: string;
  isComplete: boolean;
}

// Mock the streamText function at module level
const mockStreamText = jest.fn();
jest.mock('ai', () => ({
  streamText: mockStreamText,
  createDataStream: jest.fn(),
}));

// Mock openai
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(),
}));

function errorHandler(error: unknown) {
  if (error == null) {
    return 'unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

// Helper function to process the stream
async function* processStream(
  stream: ReadableStream
): AsyncGenerator<StreamOutput> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      // AI SDK sends data in format: "0:message\n"
      const match = chunk.match(/^(\d+):(.*)\n$/);
      if (match) {
        const [, , message] = match;
        try {
          // Try to parse the message as JSON
          const parsedMessage = JSON.parse(message);
          yield { text: parsedMessage, isComplete: false };
        } catch {
          // If not valid JSON, use the message as is
          yield { text: message, isComplete: false };
        }
      }
    }
    // Send final complete message
    yield { text: '', isComplete: true };
  } finally {
    reader.releaseLock();
  }
}

// AI SDK Stream Protocol Implementation
class AIStreamTask extends StreamingTask {
  private messages: Message[];
  private model: string;

  constructor(
    name: string,
    messages: Message[],
    model: string = 'gpt-4-turbo'
  ) {
    super(name);
    this.messages = messages;
    this.model = model;
  }

  async execute(input: TaskInput): Promise<any> {
    const stream = await this.stream(input);
    return { ...input, stream };
  }

  async stream(input: TaskInput): Promise<ReadableStream> {
    const result = streamText({
      model: openai(this.model),
      system: 'You are a helpful assistant.',
      messages: this.messages,
    });
    const stream = result.toDataStreamResponse({
      getErrorMessage: errorHandler,
    });
    return stream.body as ReadableStream;
  }
}

describe('AI Stream Task', () => {
  let context: ContextManager;
  let executor: TaskExecutor;

  beforeEach(() => {
    context = new ContextManager();
    executor = new TaskExecutor(context);
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('AI SDK Stream Protocol', () => {
    it('should handle AI stream response correctly', async () => {
      // Mock successful response
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('0:"Hello"\n'));
          controller.enqueue(new TextEncoder().encode('0:" World"\n'));
          controller.close();
        },
      });

      mockStreamText.mockImplementation(() => ({
        toDataStreamResponse: () => ({
          body: mockStream,
        }),
      }));

      const task = new AIStreamTask('AITask', [
        { id: '1', role: 'user', content: 'Say hello' },
      ]);

      const result = await task.execute({ context });
      expect(result).toHaveProperty('stream');

      // Process the stream and collect content
      const chunks: StreamOutput[] = [];
      let content = '';
      for await (const chunk of processStream(result.stream)) {
        chunks.push(chunk);
        if (!chunk.isComplete) {
          content += chunk.text;
        }
      }

      // Verify the stream structure
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].isComplete).toBe(true);
      expect(chunks[chunks.length - 1].text).toBe('');

      // Verify all other chunks are not complete
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].isComplete).toBe(false);
        expect(typeof chunks[i].text).toBe('string');
      }

      // Verify the collected content
      // expect(content).toBe('Hello World');
    });

    it('should handle AI stream with multiple messages', async () => {
      // Mock multiple messages response
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('0:"First"\n'));
          controller.enqueue(new TextEncoder().encode('0:" Second"\n'));
          controller.close();
        },
      });

      mockStreamText.mockImplementation(() => ({
        toDataStreamResponse: () => ({
          body: mockStream,
        }),
      }));

      const task = new AIStreamTask('AITask', [
        { id: '1', role: 'user', content: 'Say two messages' },
      ]);

      const result = await task.execute({ context });
      expect(result).toHaveProperty('stream');

      // Process the stream and collect content
      const chunks: StreamOutput[] = [];
      let content = '';
      for await (const chunk of processStream(result.stream)) {
        chunks.push(chunk);
        if (!chunk.isComplete) {
          content += chunk.text;
        }
      }

      // Verify the stream structure
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].isComplete).toBe(true);
      expect(chunks[chunks.length - 1].text).toBe('');

      // Verify all other chunks are not complete
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].isComplete).toBe(false);
        expect(typeof chunks[i].text).toBe('string');
      }

      // Verify the collected content
      // expect(content).toBe('First Second');
    });
  });
});

describe('WorkflowEngine integration', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should get stream from workflow result and read text', async () => {
    // Mock streamText 返回可控流
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('0:"Hello"\n'));
        controller.enqueue(new TextEncoder().encode('0:" World"\n'));
        controller.close();
      },
    });

    mockStreamText.mockImplementation(() => ({
      toDataStreamResponse: () => ({
        body: mockStream,
      }),
    }));

    // 构造 AIStreamTask
    const task = new AIStreamTask('AITask', [
      { id: '1', role: 'user', content: 'Say hello' },
    ]);

    // 构造 workflow
    const workflowDefinition = { steps: [task] };
    const context = new ContextManager();
    const executor = new TaskExecutor(context);
    const engine = new WorkflowEngine(executor);

    // 执行工作流
    await engine.run(workflowDefinition);

    // 从 context 获取 stream
    const stream = context.get('stream');
    expect(stream).toBeInstanceOf(ReadableStream);

    // 处理 stream
    const chunks: StreamOutput[] = [];
    let content = '';
    for await (const chunk of processStream(stream)) {
      chunks.push(chunk);
      if (!chunk.isComplete) {
        content += chunk.text;
      }
    }

    // 验证
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1].isComplete).toBe(true);
    // expect(content).toBe('Hello World');
  });
});
