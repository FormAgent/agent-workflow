import { AIAgent } from "./agents/aiAgent";

// 该文件是应用程序的入口点。它包含应用程序的主要逻辑和功能实现。

async function main() {
	const agent = new AIAgent();
	const input = "What is AI?"; // 示例输入
	const response = await agent.handleInput(input);
	console.log(response);
}

main();
