# API 文档

## 目录
- [API 文档](#api-文档)
  - [目录](#目录)
  - [核心类](#核心类)
    - [DAGWorkflowEngine](#dagworkflowengine)
    - [事件系统](#事件系统)
    - [WorkflowEngine](#workflowengine)
    - [TaskExecutor](#taskexecutor)
    - [ContextManager](#contextmanager)
  - [接口](#接口)
    - [Task](#task)
    - [DAGTask](#dagtask)
    - [WorkflowDefinition](#workflowdefinition)
  - [类型](#类型)
    - [TaskInput/TaskOutput](#taskinputtaskoutput)
    - [TaskStatus](#taskstatus)
  - [使用示例](#使用示例)
    - [DAG 工作流示例](#dag-工作流示例)
    - [条件分支示例](#条件分支示例)
    - [错误处理示例](#错误处理示例)

## 核心类

### DAGWorkflowEngine
DAG 工作流引擎，用于执行基于 DAG 的任务流。

```typescript
class DAGWorkflowEngine {
  constructor(executor: TaskExecutor);
  
  // 运行 DAG 工作流
  async run(dag: DAG): Promise<void>;
  
  // 获取任务状态
  getTaskStatus(task: DAGTask): TaskStatus;
  
  // 事件监听
  on(event: 'taskStatusChanged', handler: (task: DAGTask, status: TaskStatus) => void): void;
}
```

### 事件系统
```typescript
type TaskStatusEvent = {
  task: DAGTask;
  status: TaskStatus;
}
```

### WorkflowEngine
基础工作流引擎，支持顺序执行、条件分支和并行任务。

```typescript
class WorkflowEngine {
  constructor(executor: TaskExecutor);
  
  // 运行工作流
  async run(workflow: WorkflowDefinition): Promise<void>;
}
```

### TaskExecutor
任务执行器，负责任务的实际执行和上下文管理。

```typescript
class TaskExecutor {
  constructor(contextManager: ContextManager);
  
  // 执行单个任务
  async execute(task: Task): Promise<void>;
  
  // 获取上下文管理器
  getContext(): ContextManager;
}
```

### ContextManager
上下文管理器，处理任务间的数据共享。

```typescript
class ContextManager {
  // 设置上下文数据
  set(key: string, value: any): void;
  
  // 获取上下文数据
  get(key: string): any;
  
  // 获取所有上下文数据
  getAll(): Record<string, any>;
  
  // 清除上下文
  clear(): void;
}
```

## 接口

### Task
基础任务接口。

```typescript
interface Task {
  name: string;
  // 可选的输入输出模式验证
  inputSchema?: ZodSchema;
  outputSchema?: ZodSchema;
  execute(input: TaskInput): Promise<TaskOutput>;
}
```

### DAGTask
DAG 任务接口，扩展自基础任务接口。

```typescript
interface DAGTask extends Task {
  // 前置任务依赖
  dependsOn?: DAGTask[];
  
  // 条件分支
  branches?: {
    condition: (context: ContextManager) => boolean;
    next: DAGTask | DAGTask[];
  }[];
  
  // 默认分支
  defaultNext?: DAGTask | DAGTask[];
  
  // 错误处理
  onError?: (error: Error, context: ContextManager) => Promise<void>;
  
  // 重试次数
  retryCount?: number;
}
```

### WorkflowDefinition
工作流定义接口。

```typescript
interface WorkflowDefinition {
  steps: (Task | Task[] | ConditionNode)[];
}

interface ConditionNode {
  branches: ConditionBranch[];
  default?: Task | Task[];
}

interface ConditionBranch {
  condition: (context: ContextManager) => boolean;
  next: Task | Task[];
}
```

## 类型

### TaskInput/TaskOutput
任务的输入输出类型。

```typescript
type TaskInput = Record<string, any>;
type TaskOutput = Record<string, any>;
```

### TaskStatus
任务状态枚举。

```typescript
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
```

### Schema 验证
任务可以使用 Zod 来定义可选的输入和输出模式：

```typescript
import { z } from 'zod';

class WeatherTask implements DAGTask {
  name = 'WeatherTask';
  
  // 定义输入模式
  inputSchema = z.object({
    rawData: z.string(),
    cleanedData: z.string().optional(),
    intent: z.string().optional(),
  });

  // 定义输出模式
  outputSchema = z.object({
    weatherInfo: z.object({
      temperature: z.string(),
      condition: z.string(),
    }),
  });

  async execute(input: TaskInput) {
    // 输入验证
    const validatedInput = this.inputSchema.parse(input);
    
    // 任务逻辑
    const output = {
      ...input,
      weatherInfo: { temperature: '25°C', condition: '晴天' },
    };

    // 输出验证
    return this.outputSchema.parse(output);
  }
}
```

Schema 验证确保：
- 在任务执行前验证输入数据符合预期格式
- 输出数据符合指定的结构
- 运行时类型安全和自动错误处理

## 使用示例

### DAG 工作流示例

```typescript
import { DAGWorkflowEngine, TaskExecutor, ContextManager, type DAGTask } from 'dag-workflow';

// 定义任务
class TaskA implements DAGTask {
  name = 'TaskA';
  async execute(input) {
    return { ...input, resultA: 'done' };
  }
}

class TaskB implements DAGTask {
  name = 'TaskB';
  dependsOn = [new TaskA()];
  async execute(input) {
    return { ...input, resultB: 'done' };
  }
}

// 创建并运行工作流
const context = new ContextManager();
const executor = new TaskExecutor(context);
const engine = new DAGWorkflowEngine(executor);

engine.on('taskStatusChanged', (task, status) => {
  console.log(`Task ${task.name} status: ${status}`);
});

const dag = {
  tasks: [new TaskA(), new TaskB()]
};

await engine.run(dag);
```

### 条件分支示例

```typescript
import type { DAGTask, ContextManager } from 'dag-workflow';

class ConditionalTask implements DAGTask {
  name = 'ConditionalTask';
  
  branches = [{
    condition: (ctx: ContextManager) => ctx.get('value') > 5,
    next: new TaskB()
  }];
  
  defaultNext = new TaskC();
  
  async execute(input) {
    // 处理逻辑
    return input;
  }
}
```

### 错误处理示例

```typescript
class RetryableTask implements DAGTask {
  name = 'RetryableTask';
  retryCount = 3;
  
  async onError(error: Error, context: ContextManager) {
    context.set('lastError', error.message);
    // 错误处理逻辑
  }
  
  async execute(input) {
    // 可能抛出错误的任务逻辑
    return input;
  }
}
```

### AI SDK 流式用法

你可以通过 `StreamingTask` 集成 [AI SDK](https://github.com/vercel/ai)，实现大模型响应的流式处理。

```typescript
import { StreamingTask } from 'dag-workflow';
import type { TaskInput } from 'dag-workflow';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// 1. 定义一个基于 AI SDK 的 StreamingTask
class AIStreamTask extends StreamingTask {
  private messages: { id: string; role: string; content: string }[];
  private model: string;

  constructor(
    name: string,
    messages: { id: string; role: string; content: string }[],
    model: string = 'gpt-4-turbo'
  ) {
    super(name);
    this.messages = messages;
    this.model = model;
  }

  async stream(input: TaskInput): Promise<ReadableStream> {
    // 使用 AI SDK 获取流式响应
    const result = streamText({
      model: openai(this.model),
      system: 'You are a helpful assistant.',
      messages: this.messages,
    });
    // 转为 ReadableStream
    const stream = result.toDataStreamResponse();
    return stream.body as ReadableStream;
  }
}

// 2. 执行并消费流
const task = new AIStreamTask('AITask', [
  { id: '1', role: 'user', content: 'Say hello' },
]);
const result = await task.execute({ context: {} }); // context 可为你的 ContextManager

// 3. 读取流内容
async function readStream(stream: ReadableStream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let content = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // AI SDK 数据格式: "0:\"Hello\"\n"
      const chunk = decoder.decode(value, { stream: true });
      const match = chunk.match(/^\d+:(.*)\n$/);
      if (match) {
        let message = match[1];
        // 去除引号
        if (message.startsWith('"') && message.endsWith('"')) {
          message = message.slice(1, -1);
        }
        content += message;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return content;
}

const content = await readStream(result.stream);
console.log(content); // 输出: Hello（或完整流式响应）
```

**要点：**
- 通过实现 `stream(input)`，`StreamingTask` 可返回文本分块的 `ReadableStream`。
- 每个分块由 AI SDK 产生并拼接为最终内容。
- 适合实时处理 LLM 输出，如聊天机器人、助手等。 