import { jest } from '@jest/globals';
import { ContextManager } from '../ContextManager';
import { TaskExecutor } from '../TaskExecutor';
import { StreamingTask } from '../StreamingTask';
import type { TaskInput } from '../Task';

interface StreamOutput {
  text: string;
  isComplete: boolean;
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
      const data = JSON.parse(chunk);
      yield { text: data.text, isComplete: data.isComplete };
    }
  } finally {
    reader.releaseLock();
  }
}

// Concrete implementation for testing
class MockStreamingTask extends StreamingTask {
  private chunks: StreamOutput[];
  private shouldFail: boolean;
  private delay: number;

  constructor(
    name: string,
    chunks: StreamOutput[] = [],
    shouldFail: boolean = false,
    delay: number = 0
  ) {
    super(name);
    this.chunks = chunks;
    this.shouldFail = shouldFail;
    this.delay = delay;
  }

  async stream(input: TaskInput): Promise<ReadableStream> {
    if (this.shouldFail) {
      throw new Error('Stream failed');
    }

    return new ReadableStream({
      start: async (controller) => {
        for (const chunk of this.chunks) {
          if (this.delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.delay));
          }
          controller.enqueue(new TextEncoder().encode(JSON.stringify(chunk)));
        }
        controller.close();
      },
    });
  }
}

describe('StreamingTask', () => {
  let context: ContextManager;
  let executor: TaskExecutor;

  beforeEach(() => {
    context = new ContextManager();
    executor = new TaskExecutor(context);
  });

  describe('execute', () => {
    it('should execute task and return stream', async () => {
      const task = new MockStreamingTask('StoryTask', [
        { text: 'Once', isComplete: false },
        { text: ' upon', isComplete: false },
        { text: ' a time...', isComplete: false },
        { text: '', isComplete: true },
      ]);

      const result = await task.execute({ context });
      expect(result).toHaveProperty('stream');
      expect(result.stream).toBeInstanceOf(ReadableStream);

      // Process the stream and collect content
      const chunks: StreamOutput[] = [];
      let content = '';
      for await (const chunk of processStream(result.stream)) {
        chunks.push(chunk);
        if (!chunk.isComplete) {
          content += chunk.text;
        }
      }

      expect(chunks).toEqual([
        { text: 'Once', isComplete: false },
        { text: ' upon', isComplete: false },
        { text: ' a time...', isComplete: false },
        { text: '', isComplete: true },
      ]);
      expect(content).toBe('Once upon a time...');
    });

    it('should handle execution errors', async () => {
      const task = new MockStreamingTask('FailingTask', [], true);

      await expect(task.execute({ context })).rejects.toThrow('Stream failed');
    });

    it('should handle empty content', async () => {
      const task = new MockStreamingTask('EmptyTask', [
        { text: '', isComplete: true },
      ]);

      const result = await task.execute({ context });
      expect(result).toHaveProperty('stream');
      expect(result.stream).toBeInstanceOf(ReadableStream);

      const chunks: StreamOutput[] = [];
      for await (const chunk of processStream(result.stream)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([{ text: '', isComplete: true }]);
    });
  });

  describe('stream', () => {
    it('should stream content chunks', async () => {
      const task = new MockStreamingTask('StoryTask', [
        { text: 'Once', isComplete: false },
        { text: ' upon', isComplete: false },
        { text: ' a time...', isComplete: false },
        { text: '', isComplete: true },
      ]);

      const stream = await task.stream({ context });
      expect(stream).toBeInstanceOf(ReadableStream);

      const chunks: StreamOutput[] = [];
      for await (const chunk of processStream(stream)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { text: 'Once', isComplete: false },
        { text: ' upon', isComplete: false },
        { text: ' a time...', isComplete: false },
        { text: '', isComplete: true },
      ]);
    });

    it('should handle streaming errors', async () => {
      const task = new MockStreamingTask('FailingTask', [], true);

      await expect(task.stream({ context })).rejects.toThrow('Stream failed');
    });

    it('should handle delayed streaming', async () => {
      const task = new MockStreamingTask(
        'DelayedTask',
        [
          { text: 'Delayed', isComplete: false },
          { text: ' response', isComplete: false },
          { text: '', isComplete: true },
        ],
        false,
        100
      );

      const startTime = Date.now();
      const stream = await task.stream({ context });
      expect(stream).toBeInstanceOf(ReadableStream);

      const chunks: StreamOutput[] = [];
      for await (const chunk of processStream(stream)) {
        chunks.push(chunk);
      }
      const endTime = Date.now();

      expect(chunks).toEqual([
        { text: 'Delayed', isComplete: false },
        { text: ' response', isComplete: false },
        { text: '', isComplete: true },
      ]);
      expect(endTime - startTime).toBeGreaterThanOrEqual(200); // At least 200ms for 2 chunks
    });

    it('should handle multiple streaming tasks in parallel', async () => {
      const task1 = new MockStreamingTask('Task1', [
        { text: 'Task1', isComplete: false },
        { text: '', isComplete: true },
      ]);

      const task2 = new MockStreamingTask('Task2', [
        { text: 'Task2', isComplete: false },
        { text: '', isComplete: true },
      ]);

      const results = await Promise.all([
        task1.execute({ context }),
        task2.execute({ context }),
      ]);

      expect(results[0].stream).toBeInstanceOf(ReadableStream);
      expect(results[1].stream).toBeInstanceOf(ReadableStream);

      const content1: string[] = [];
      const content2: string[] = [];

      for await (const chunk of processStream(results[0].stream)) {
        if (!chunk.isComplete) content1.push(chunk.text);
      }

      for await (const chunk of processStream(results[1].stream)) {
        if (!chunk.isComplete) content2.push(chunk.text);
      }

      expect(content1.join('')).toBe('Task1');
      expect(content2.join('')).toBe('Task2');
    });

    it('should handle large content streaming', async () => {
      const largeContent = Array.from({ length: 1000 }, (_, i) => ({
        text: `Chunk ${i}`,
        isComplete: false,
      }));
      largeContent.push({ text: '', isComplete: true });

      const task = new MockStreamingTask('LargeTask', largeContent);

      const stream = await task.stream({ context });
      expect(stream).toBeInstanceOf(ReadableStream);

      const chunks: StreamOutput[] = [];
      for await (const chunk of processStream(stream)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1001);
      expect(chunks[chunks.length - 1].isComplete).toBe(true);
    });

    it('should handle streaming with context updates', async () => {
      class ContextAwareTask extends StreamingTask {
        async stream(input: TaskInput): Promise<ReadableStream> {
          const ctx = input.context;
          ctx.set('counter', 0);

          return new ReadableStream({
            start: async (controller) => {
              for (let i = 0; i < 3; i++) {
                ctx.set('counter', i + 1);
                controller.enqueue(
                  new TextEncoder().encode(
                    JSON.stringify({
                      text: `Count: ${i + 1}`,
                      isComplete: false,
                    })
                  )
                );
              }
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({ text: '', isComplete: true })
                )
              );
              controller.close();
            },
          });
        }
      }

      const task = new ContextAwareTask('ContextTask');
      const stream = await task.stream({ context });
      expect(stream).toBeInstanceOf(ReadableStream);

      const chunks: StreamOutput[] = [];
      for await (const chunk of processStream(stream)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { text: 'Count: 1', isComplete: false },
        { text: 'Count: 2', isComplete: false },
        { text: 'Count: 3', isComplete: false },
        { text: '', isComplete: true },
      ]);
      expect(context.get('counter')).toBe(3);
    });

    it('should handle streaming with error recovery', async () => {
      class ErrorRecoveryTask extends StreamingTask {
        private attempts = 0;

        async stream(input: TaskInput): Promise<ReadableStream> {
          this.attempts++;
          if (this.attempts === 1) {
            throw new Error('First attempt failed');
          }

          return new ReadableStream({
            start: (controller) => {
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({ text: 'Recovered', isComplete: false })
                )
              );
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({ text: '', isComplete: true })
                )
              );
              controller.close();
            },
          });
        }
      }

      const task = new ErrorRecoveryTask('RecoveryTask');

      // First attempt should fail
      try {
        await task.execute({ context });
        fail('Expected first attempt to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toBe('First attempt failed');
        }
      }

      // Second attempt should succeed
      const result = await task.execute({ context });
      expect(result.stream).toBeInstanceOf(ReadableStream);

      const chunks: StreamOutput[] = [];
      for await (const chunk of processStream(result.stream)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { text: 'Recovered', isComplete: false },
        { text: '', isComplete: true },
      ]);
    });
  });
});
