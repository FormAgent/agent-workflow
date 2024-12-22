// 处理用户输入的验证、清洗和标准化
interface InputResult {
	original: string;
	sanitized: string;
	intent: string;
	entities: { [key: string]: string };
}

export function getInput(input: string): InputResult {
	const sanitized = input.trim();
	if (!sanitized) throw new Error("Empty input is not allowed.");

	// 假设调用 NLU 模块解析意图和实体
	return {
		original: input,
		sanitized,
		intent: detectIntent(sanitized),
		entities: extractEntities(sanitized),
	};
}

function detectIntent(input: string): string {
	// 模拟意图检测
	return "search";
}

function extractEntities(input: string): { [key: string]: string } {
	// 模拟实体提取
	return { query: input };
}
