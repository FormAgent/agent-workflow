export class MemoryManager {
	private history: string[];

	constructor() {
		this.history = [];
	}

	record(input: string, output: string): void {
		this.history.push(`User: ${input}`);
		this.history.push(`Agent: ${output}`);
	}

	getHistory(): string[] {
		return this.history;
	}
}
