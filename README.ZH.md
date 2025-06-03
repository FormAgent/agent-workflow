# DAG 工作流引擎

一个强大的工作流引擎，支持 DAG（有向无环图）任务调度，具有条件分支、并行执行和上下文管理功能。

[English](./README.md)

## 特性

- 🔄 DAG 任务调度
  - 支持复杂的任务依赖关系
  - 自动检测循环依赖
  - 支持多层级任务执行
  - 任务重试机制
  - ✅ AI SDK 流式支持  可无缝集成 AI SDK，实现 LLM 响应流式处理。
  
- 🔀 条件分支
  - 动态条件判断
  - 多分支路径选择
  - 默认分支支持
  
- ⚡ 并行执行
  - 同级任务并行处理
  - 支持多任务组合
  
- 📦 上下文管理
  - 任务间数据共享
  - 动态上下文更新
  - 状态追踪
  - 任务状态变更通知

## 安装

```bash
npm install agent-workflow
# 或
yarn add agent-workflow
# 或
pnpm add agent-workflow
```

## 快速开始

### 基础示例：天气查询工作流

```typescript
import { 
  DAGWorkflowEngine, 
  TaskExecutor, 
  ContextManager,
  type DAGTask,
  type TaskInput 
} from 'agent-workflow';

// 1. 定义任务
class DataCleanTask implements DAGTask {
  name = 'DataCleanTask';
  async execute(input: TaskInput) {
    const rawData = input.rawData;
    const cleanedData = rawData.trim().replace(/\s+/g, ' ').toLowerCase();
    return { ...input, cleanedData };
  }
}

class IntentRecognitionTask implements DAGTask {
  name = 'IntentRecognitionTask';
  async execute(input: TaskInput) {
    const cleanedData = input.cleanedData.toLowerCase();
    const intent = cleanedData.includes('weather')
      ? 'weather_query'
      : 'unknown';
    return { ...input, intent };
  }
}

class WeatherTask implements DAGTask {
  name = 'WeatherTask';
  async execute(input: TaskInput) {
    return {
      ...input,
      weatherInfo: { temperature: '25°C', condition: '晴天' },
    };
  }
}

class DefaultTask implements DAGTask {
  name = 'DefaultTask';
  async execute(input: TaskInput) {
    return {
      ...input,
      defaultResponse: '抱歉，我不理解您的请求。',
    };
  }
}

// 2. 创建工作流
const workflowDefinition = {
  tasks: [
    new DataCleanTask(),
    new IntentRecognitionTask(),
    {
      branches: [
        {
          condition: (context) => context.get('intent') === 'weather_query',
          next: new WeatherTask(),
        },
      ],
      default: new DefaultTask(),
    },
  ],
};

// 3. 运行工作流
const context = new ContextManager();
const executor = new TaskExecutor(context);
const engine = new DAGWorkflowEngine(executor);

// 监听任务状态变化
engine.on('taskStatusChanged', (task, status) => {
  console.log(`任务 ${task.name} 状态: ${status}`);
});

// 设置初始数据并运行
context.set('rawData', '今天天气怎么样');
await engine.run(workflowDefinition);

// 获取结果
console.log(context.get('weatherInfo')); // { temperature: '25°C', condition: '晴天' }
```

### 复杂示例：多层条件任务

```typescript
import type { DAGTask, ContextManager } from 'agent-workflow';

// 定义不同处理路径的任务
class TaskA implements DAGTask {
  name = 'TaskA';
  async execute(input: TaskInput) {
    // 初始处理
    return { ...input, valueA: '已处理' };
  }
}

class TaskB implements DAGTask {
  name = 'TaskB';
  dependsOn = [taskA]; // 依赖于 TaskA
  async execute(input: TaskInput) {
    // 处理路径 B
    return { ...input, valueB: '已处理' };
  }
}

class TaskC implements DAGTask {
  name = 'TaskC';
  dependsOn = [taskA]; // 依赖于 TaskA
  async execute(input: TaskInput) {
    // 处理路径 C
    return { ...input, valueC: '已处理' };
  }
}

// 创建条件任务
const conditionalTask = {
  name: 'ConditionalTask',
  dependsOn: [taskA],
  branches: [
    {
      condition: (ctx: ContextManager) => ctx.get('value') > 5,
      next: taskB,
    },
    {
      condition: (ctx: ContextManager) => ctx.get('value') <= 5,
      next: taskC,
    },
  ],
};

// 创建 DAG
const dag = {
  tasks: [taskA, conditionalTask, taskB, taskC],
};

// 运行工作流
const context = new ContextManager();
context.set('value', 10); // 这将触发 taskB 路径
const executor = new TaskExecutor(context);
const engine = new DAGWorkflowEngine(executor);
await engine.run(dag);
```

## AI SDK 流式用法

工作流引擎支持通过 [AI SDK](https://github.com/vercel/ai) 实现大模型响应的流式处理。
你可以实现一个 StreamingTask 返回 ReadableStream，并像消费普通流一样逐步获取输出。

完整示例见 [API 文档](./docs/api.zh.md#ai-sdk-流式用法)。

## API 文档

详细的 API 文档请参考 [API 文档](./docs/api.md)

## 测试

```bash
pnpm test
```

## 构建

```bash
pnpm build
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT © [FormAgent](https://github.com/FormAgent)