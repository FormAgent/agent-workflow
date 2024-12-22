// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function log(message: string, error?: any): void {
	console.log(message, error || "");
}
