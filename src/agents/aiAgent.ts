import { MemoryManager } from "../memory/memoryManager";
import { OutputProcessor } from "../output/outputProcessor";
import { TaskManager } from "../process/taskManager";
import { log } from "../utils/logger";
import { TaskWorker } from "../workers/taskWorker";

export class AIAgent {
	private memory: MemoryManager;
	private taskManager: TaskManager;
	private taskWorker: TaskWorker;

	constructor() {
		this.memory = new MemoryManager();
		this.taskManager = new TaskManager();
		this.taskWorker = new TaskWorker();
	}

	async handleInput(input: string): Promise<string> {
		try {
			// 输入处理
			const processedInput = this.processInput(input);

			// 根据上下文和输入决策任务
			const task = this.taskManager.decide(processedInput, this.memory);

			// 添加任务到队列
			this.taskManager.addTask(task);

			// 执行任务队列
			await this.processTasks();

			// 输出处理
			return OutputProcessor.format(task.result);
		} catch (error) {
			log("Error occurred:", error);
			return "An error occurred while processing your request.";
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private processInput(input: string): any {
		const sanitized = input.trim();
		if (!sanitized) throw new Error("Empty input is not allowed.");

		// 假设调用 NLU 模块解析意图和实体
		return {
			original: input,
			sanitized,
			intent: this.detectIntent(sanitized),
			entities: this.extractEntities(sanitized),
		};
	}

	private detectIntent(input: string): string {
		// 模拟意图检测
		return "search";
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private extractEntities(input: string): any {
		// 模拟实体提取
		return { query: input };
	}

	private async processTasks(): Promise<void> {
		let task = this.taskManager.getNextTask();
		while (task) {
			console.log(`Processing task: ${task.id} (${task.type})`);
			this.taskManager.updateTaskStatus(task.id, "in_progress");

			try {
				const result = await this.taskWorker.execute(task);
				task.result = result;
				this.taskManager.updateTaskStatus(task.id, "completed");
				console.log(`Task completed: ${task.id}, Result:`, result);
			} catch (error: unknown) {
				if (error instanceof Error) {
					console.error(`Task failed: ${task.id}, Error:`, error.message);
				} else {
					console.error(`Task failed: ${task.id}, Unknown error`);
				}
			}

			task = this.taskManager.getNextTask();
		}
	}
}
