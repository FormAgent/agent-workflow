import type { MemoryManager } from "../memory/memoryManager";
import { type Task, type TaskStatus, TaskType } from "../types/task";

export class TaskManager {
	private taskQueue: Task[] = []; // 任务队列

	// 添加任务到队列
	addTask(task: Task): void {
		this.taskQueue.push(task);
		this.taskQueue.sort((a, b) => b.priority - a.priority); // 按优先级排序
	}

	// 获取下一个任务
	getNextTask(): Task | undefined {
		return this.taskQueue.find((task) => task.status === "pending");
	}

	// 更新任务状态
	updateTaskStatus(taskId: string, status: TaskStatus): void {
		const task = this.taskQueue.find((t) => t.id === taskId);
		if (task) task.status = status;
	}

	// 决策任务
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	decide(input: any, memory: MemoryManager): Task {
		// 简单任务分配逻辑
		if (input.intent === "search") {
			return {
				id: this.generateTaskId(),
				type: "search",
				payload: input.entities.query,
				status: "pending",
				priority: 2,
			};
		}
		if (input.intent === "knowledge") {
			return {
				id: this.generateTaskId(),
				type: "knowledge_query",
				payload: input.entities.topic,
				status: "pending",
				priority: 3,
			};
		}
		return {
			id: this.generateTaskId(),
			type: "default",
			payload: null,
			status: "pending",
			priority: 1,
		};
	}

	// 生成唯一任务 ID
	private generateTaskId(): string {
		return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}
