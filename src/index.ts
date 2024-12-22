import { AIAgent } from "./agents/aiAgent";

async function main() {
	const agent = new AIAgent();
	const input = "What is AI?"; // 示例输入
	const response = await agent.handleInput(input);
	console.log(response);
}

main();
