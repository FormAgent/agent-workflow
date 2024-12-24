//任务执行器
// 任务执行器用于调用任务逻辑，并将结果更新到上下文中
import type { ContextManager } from './ContextManager';
import type { Task } from './Task';
import { ZodSchema } from 'zod';

export class TaskExecutor {
  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async execute(task: Task): Promise<void> {
    let input = this.contextManager.getAll(); // 获取上下文

    // Validate input using inputSchema if defined
    if (task.inputSchema) {
      try {
        input = await task.inputSchema.parseAsync(input);
      } catch (error) {
        console.error('Input validation failed:', error);
        throw error;
      }
    }

    let output = await task.execute(input); // 执行任务

    // Validate output using outputSchema if defined
    if (task.outputSchema) {
      try {
        output = await task.outputSchema.parseAsync(output);
      } catch (error) {
        console.error('Output validation failed:', error);
        throw error;
      }
    }

    for (const [key, value] of Object.entries(output)) {
      this.contextManager.set(key, value); // 更新上下文
    }
    console.log(`Task ${task} executed. Output:`, output);
  }

  getContext(): ContextManager {
    return this.contextManager;
  }
}
