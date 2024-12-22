import type { Task } from "../types/task";

export class TaskWorker {
	// 执行任务
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	async execute(task: Task): Promise<any> {
		switch (task.type) {
			case "search":
				return await this.handleSearch(task.payload);
			case "calculation":
				return await this.handleCalculation(task.payload);
			case "knowledge_query":
				return await this.handleKnowledgeQuery(task.payload);
			default:
				throw new Error(`Unknown task type: ${task.type}`);
		}
	}

	// 搜索任务
	private async handleSearch(query: string): Promise<string> {
		return `Search results for "${query}"`; // 模拟搜索结果
	}

	// 计算任务
	private async handleCalculation(expression: string): Promise<number> {
		// biome-ignore lint/security/noGlobalEval: <explanation>
		return eval(expression); // 简单计算
	}

	// 知识查询任务
	private async handleKnowledgeQuery(topic: string): Promise<string> {
		return `Knowledge about "${topic}"`; // 模拟知识库结果
	}
}
