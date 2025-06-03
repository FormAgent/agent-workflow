import { type DAGTask } from '../DAG';
import { type TaskInput } from '../Task';
import { TaskRegistry, type TaskDefinition } from '../TaskRegistry';

// Coder Task
class CoderTask implements DAGTask {
  name = 'CoderTask';
  async execute(input: TaskInput): Promise<TaskInput> {
    // 这里实现代码生成逻辑
    return { ...input, code: 'Generated code will be here' };
  }
}

// File Task
class FileTask implements DAGTask {
  name = 'FileTask';
  async execute(input: TaskInput): Promise<TaskInput> {
    // 这里实现文件操作逻辑
    return { ...input, fileOperation: 'File operation result' };
  }
}

// Web Task
class WebTask implements DAGTask {
  name = 'WebTask';
  async execute(input: TaskInput): Promise<TaskInput> {
    // 这里实现网络搜索和浏览逻辑
    return { ...input, webResult: 'Web search result' };
  }
}

// Casual Task
class CasualTask implements DAGTask {
  name = 'CasualTask';
  async execute(input: TaskInput): Promise<TaskInput> {
    // 这里实现对话逻辑
    return { ...input, response: 'Conversational response' };
  }
}

// 注册任务
export function registerBaseTasks(): void {
  const registry = TaskRegistry.getInstance();

  registry.registerTask({
    name: 'CoderTask',
    description:
      'A programming agent that can code in Python, Bash, C and Golang',
    capabilities: ['coding', 'programming', 'development'],
    createTask: () => new CoderTask(),
  });

  registry.registerTask({
    name: 'FileTask',
    description: 'An agent for finding, reading or operating with files',
    capabilities: ['file_operation', 'file_management'],
    createTask: () => new FileTask(),
  });

  registry.registerTask({
    name: 'WebTask',
    description:
      'An agent that can conduct web search and navigate to any webpage',
    capabilities: ['web_search', 'web_navigation'],
    createTask: () => new WebTask(),
  });

  registry.registerTask({
    name: 'CasualTask',
    description: 'A conversational agent for general responses',
    capabilities: ['conversation', 'general_response'],
    createTask: () => new CasualTask(),
  });
}
