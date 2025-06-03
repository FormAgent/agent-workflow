import { type DAGTask } from './DAG';

export interface TaskDefinition {
  name: string;
  description: string;
  capabilities: string[];
  createTask: () => DAGTask;
}

export class TaskRegistry {
  private static instance: TaskRegistry;
  private tasks: Map<string, TaskDefinition> = new Map();

  private constructor() {}

  static getInstance(): TaskRegistry {
    if (!TaskRegistry.instance) {
      TaskRegistry.instance = new TaskRegistry();
    }
    return TaskRegistry.instance;
  }

  registerTask(definition: TaskDefinition): void {
    this.tasks.set(definition.name, definition);
  }

  getTask(name: string): TaskDefinition | undefined {
    return this.tasks.get(name);
  }

  getAllTasks(): TaskDefinition[] {
    return Array.from(this.tasks.values());
  }

  getTasksByCapability(capability: string): TaskDefinition[] {
    return this.getAllTasks().filter((task) =>
      task.capabilities.includes(capability)
    );
  }

  clear(): void {
    this.tasks.clear();
  }
}
