//上下文管理器
// 上下文用于任务之间的数据共享，并动态更新
import type { TaskInput } from "./Task";

export class ContextManager {
  private context: TaskInput = {};

  // 获取上下文中的数据
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  get(key: string): any {
    return this.context[key];
  }

  // 设置上下文中的数据
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  set(key: string, value: any): void {
    this.context[key] = value;
  }

  // 获取完整上下文
  getAll(): TaskInput {
    return this.context;
  }

  // 清除上下文
  clear(): void {
    this.context = {};
  }
}
