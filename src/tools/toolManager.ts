abstract class Tool {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	abstract run(payload: any): Promise<string>;
}
class SearchTool extends Tool {
	async run(query: string): Promise<string> {
		// 模拟搜索工具
		return `Search results for "${query}"`;
	}
}

export class ToolManager {
	private tools: Record<string, Tool>;

	constructor() {
		this.tools = {
			search_engine: new SearchTool(),
		};
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	async execute(toolName: string, payload: any): Promise<string> {
		const tool = this.tools[toolName];
		if (!tool) throw new Error(`Tool "${toolName}" not found.`);
		return await tool.run(payload);
	}
}
