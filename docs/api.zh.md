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