import { Task, type TaskInput } from './Task';

export abstract class StreamingTask implements Task {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async execute(input: TaskInput): Promise<any> {
    const stream = await this.stream(input);
    return { ...input, stream };
  }

  abstract stream(input: TaskInput): Promise<ReadableStream>;
}
