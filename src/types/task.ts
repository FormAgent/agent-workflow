// 任务类型
export type TaskType = "search" | "knowledge_query" | "calculation" | "default";

// 任务状态
export type TaskStatus = "pending" | "in_progress" | "completed";

// 任务定义
export interface Task {
	id: string; // 唯一标识符
	type: TaskType;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	payload: any; // 任务参数
	status: TaskStatus;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	result?: any; // 任务结果
	priority: number; // 优先级
}
