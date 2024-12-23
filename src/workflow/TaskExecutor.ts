//任务执行器
// 任务执行器用于调用任务逻辑，并将结果更新到上下文中
import type { ContextManager } from './ContextManager';
import type { Task } from './TaskRegistry';

export class TaskExecutor {
  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async execute(task: Task): Promise<void> {
    const input = this.contextManager.getAll(); // 获取上下文
    const output = await task.execute(input); // 执行任务
    for (const [key, value] of Object.entries(output)) {
      this.contextManager.set(key, value); // 更新上下文
    }
    console.log(`Task ${task} executed. Output:`, output);
  }

  getContext(): ContextManager {
    return this.contextManager;
  }
}
