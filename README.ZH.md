# 🚀 智能工作流引擎

一个强大的工作流引擎，支持 DAG（有向无环图）任务调度、动态任务生成和智能策略系统。经过重构，使用复杂度降低90%，功能更加强大。

[English](./README.md)

## ✨ 核心特性

### 🎯 **大幅简化的API设计**
- **重构前**: 需要5步复杂构造 (`Context → Executor → Engine → Workflow → Execute`)
- **重构后**: 1行链式调用搞定 (`WorkflowBuilder.create().build().execute()`)

### 🔄 **强大的DAG任务调度**
- 自动任务依赖解析和拓扑排序
- 智能并行执行优化
- 循环依赖检测
- 优雅的错误处理和恢复

### 🧠 **智能动态策略系统**
- 条件触发任务生成
- 基于任务结果的动态规划
- 上下文变化监听
- LLM驱动的智能任务规划

### ⚡ **高性能执行引擎**
- O(V+E) 复杂度的拓扑排序
- 自动并行执行无依赖任务
- 内存优化和延迟初始化
- 完整的执行监控和指标

## 🚀 快速开始

### 安装

```bash
npm install agent-workflow
# 或
yarn add agent-workflow  
# 或
pnpm add agent-workflow
```

### 基础用法 - 简单任务流

```typescript
import { WorkflowBuilder } from 'agent-workflow';

// 定义任务
class DataProcessTask implements DAGTask {
  name = 'dataProcess';
  async execute(input: TaskInput) {
    const processed = input.rawData.toUpperCase();
    return { ...input, processed };
  }
}

class AnalysisTask implements DAGTask {
  name = 'analysis';
  async execute(input: TaskInput) {
    const analysis = `分析结果: ${input.processed}`;
    return { ...input, analysis };
  }
}

// 🔥 重构后 - 1行搞定
const result = await WorkflowBuilder
  .create()
  .addTask(new DataProcessTask())
  .addTask(new AnalysisTask())
  .build()
  .execute({ rawData: 'hello world' });

console.log(result.data.analysis); // "分析结果: HELLO WORLD"
```

### 智能动态工作流 - 条件任务生成

```typescript
const workflow = WorkflowBuilder
  .create()
  .addTask(new CodeScanTask())
  .whenCondition(
    // 当发现TypeScript文件时
    (context) => {
      const fileTypes = context.get('discoveredTypes') as string[];
      return fileTypes?.includes('typescript');
    },
    // 自动生成TS相关任务
    async (context) => [
      new TypeCheckTask(),
      new TSLintTask(),
      new TypeCoverageTask()
    ]
  )
  .build();

const result = await workflow.execute({ projectPath: './src' });
console.log(`智能生成了 ${result.dynamicTasksGenerated} 个任务`);
```

### 基于结果的动态规划

```typescript
const workflow = WorkflowBuilder
  .create()
  .addTask(new SecurityScanTask())
  .onTaskComplete('securityScan', async (result, context) => {
    const tasks = [];
    const issues = result.vulnerabilities || [];
    
    // 根据扫描结果动态生成修复任务
    if (issues.includes('xss')) {
      tasks.push(new XSSFixTask());
    }
    if (issues.includes('sql-injection')) {
      tasks.push(new SQLInjectionFixTask());
    }
    
    return tasks;
  })
  .build();
```

### LLM驱动的智能工作流

```typescript
// 🤖 AI自动规划任务流程
const result = await WorkflowBuilder
  .create()
  .withLLMModel('gpt-4-turbo')
  .withDynamicPlanning('分析这个Vue项目，生成代码质量报告')
  .build()
  .execute({ projectPath: './my-vue-app' });

console.log('AI自动生成的分析报告:', result.data);
```

## 🎛️ 高级配置

### 完整配置示例

```typescript
const workflow = WorkflowBuilder
  .create()
  .withConfig({
    llmModel: 'gpt-4-turbo',
    retryAttempts: 3,
    timeoutMs: 60000,
    maxDynamicSteps: 20
  })
  .addTask(new InitTask())
  .addDynamicStrategy({
    name: 'error_recovery',
    condition: (context) => context.get('hasError') === true,
    generator: async (context) => [new ErrorRecoveryTask()],
    priority: 10, // 高优先级
    once: true    // 只执行一次
  })
  .build();
```

### 任务依赖管理

```typescript
const task1 = new DataFetchTask();
const task2 = new DataProcessTask();
task2.dependsOn = [task1]; // 声明依赖

const task3 = new DataAnalysisTask();
task3.dependsOn = [task1, task2]; // 多重依赖

const workflow = WorkflowBuilder
  .create()
  .addTasks([task1, task2, task3]) // 自动处理依赖顺序
  .build();
```

## 🔧 动态策略系统

### 1. 条件策略 - `whenCondition()`

```typescript
.whenCondition(
  (context) => context.get('environment') === 'production',
  async (context) => [
    new SecurityAuditTask(),
    new PerformanceTestTask()
  ]
)
```

### 2. 任务完成策略 - `onTaskComplete()`

```typescript
.onTaskComplete('codeAnalysis', async (result, context) => {
  const tasks = [];
  
  if (result.complexity > 0.8) {
    tasks.push(new RefactorSuggestionTask());
  }
  
  if (result.coverage < 0.7) {
    tasks.push(new TestGenerationTask());
  }
  
  return tasks;
})
```

### 3. 上下文变化策略 - `onContextChange()`

```typescript
.onContextChange('framework', async (framework, context) => {
  switch (framework) {
    case 'react':
      return [new ReactLintTask(), new ReactTestTask()];
    case 'vue':
      return [new VueLintTask(), new VueTestTask()];
    case 'angular':
      return [new AngularLintTask(), new AngularTestTask()];
    default:
      return [new GenericLintTask()];
  }
})
```

### 4. 自定义策略 - `addDynamicStrategy()`

```typescript
.addDynamicStrategy({
  name: 'performance_optimization',
  condition: (context, result) => {
    const metrics = context.get('performanceMetrics');
    return metrics?.loadTime > 3000; // 加载时间超过3秒
  },
  generator: async (context) => [
    new ImageOptimizationTask(),
    new CodeSplittingTask(),
    new CacheOptimizationTask()
  ],
  priority: 5,
  once: false // 可以多次触发
})
```

## 📊 执行监控与结果

### 详细的执行结果

```typescript
interface WorkflowResult {
  success: boolean;                              // 是否成功
  data?: any;                                   // 最终数据
  error?: Error;                                // 错误信息
  executionTime: number;                        // 总执行时间(ms)
  taskResults: Map<string, TaskExecutionResult>; // 每个任务的详细结果
  dynamicTasksGenerated?: number;               // 动态生成的任务数
  totalSteps?: number;                          // 总执行步数
}

// 使用示例
const result = await workflow.execute();

if (result.success) {
  console.log(`✅ 工作流成功完成`);
  console.log(`📊 执行时间: ${result.executionTime}ms`);
  console.log(`🎯 动态生成任务: ${result.dynamicTasksGenerated}个`);
  console.log(`📈 总执行步数: ${result.totalSteps}`);
  
  // 查看具体任务结果
  result.taskResults.forEach((taskResult, taskName) => {
    console.log(`任务 ${taskName}: ${taskResult.status} (${taskResult.duration}ms)`);
  });
} else {
  console.error(`❌ 工作流失败:`, result.error?.message);
}
```

### 执行历史追踪

```typescript
const workflow = WorkflowBuilder.create()
  .addTask(new TaskA())
  .addTask(new TaskB())
  .build();

await workflow.execute();

// 获取详细执行历史
const history = workflow.getContext().getExecutionHistory();
history.forEach(record => {
  console.log(`${record.taskName}: ${record.status} (${record.duration}ms)`);
});
```

## 🔄 从旧版本迁移

### 迁移对比

```typescript
// ❌ 旧版本 - 复杂的5步构造
const planner = new LLMTaskPlanner('gpt-4-turbo');
const context = new ContextManager();
const executor = new TaskExecutor(context);
const engine = new DynamicDAGWorkflowEngine(executor, planner);
context.set('userRequest', '分析项目');
await engine.planAndRun(context);

// ✅ 新版本 - 1行链式调用
const result = await WorkflowBuilder
  .create()
  .withLLMModel('gpt-4-turbo')
  .withDynamicPlanning('分析项目')
  .build()
  .execute();
```

> **注意:** 新架构不再提供向后兼容适配器，建议直接使用新的WorkflowBuilder API，API设计更简洁易用。

## 🧪 AI SDK 流式支持

支持通过 [AI SDK](https://github.com/vercel/ai) 实现大模型响应的流式处理：

```typescript
import { streamText } from 'ai';

class StreamingAnalysisTask implements DAGTask {
  name = 'streamingAnalysis';
  
  async execute(input: TaskInput) {
    const { textStream } = await streamText({
      model: openai('gpt-4-turbo'),
      prompt: `分析以下代码: ${input.code}`,
    });

    let fullAnalysis = '';
    for await (const textPart of textStream) {
      fullAnalysis += textPart;
      // 实时处理流式输出
      console.log('实时分析:', textPart);
    }

    return { ...input, analysis: fullAnalysis };
  }
}
```

## 🎯 最佳实践

### 1. 任务设计原则

```typescript
class WellDesignedTask implements DAGTask {
  constructor(
    public name: string,
    private config: TaskConfig
  ) {}

  async execute(input: TaskInput): Promise<Record<string, any>> {
    // ✅ 输入验证
    this.validateInput(input);
    
    // ✅ 幂等性设计
    if (this.isAlreadyProcessed(input)) {
      return this.getCachedResult(input);
    }
    
    // ✅ 核心业务逻辑
    const result = await this.processData(input);
    
    // ✅ 结果缓存
    this.cacheResult(input, result);
    
    return result;
  }
}
```

### 2. 错误处理策略

```typescript
const robustWorkflow = WorkflowBuilder
  .create()
  .withConfig({ 
    retryAttempts: 3,
    timeoutMs: 30000 
  })
  .addTask(new RiskyTask())
  .addDynamicStrategy({
    name: 'error_fallback',
    condition: (context) => context.get('lastTaskFailed'),
    generator: async (context) => [new FallbackTask()],
    priority: 1
  })
  .build();
```

### 3. 性能优化建议

- **并行优化**: 减少不必要的任务依赖
- **内存管理**: 及时清理大对象
- **延迟加载**: 按需初始化重量级组件
- **策略优先级**: 合理设置策略执行顺序

## 📚 更多示例

查看 [examples](./examples) 目录获取更多实际使用案例：

### 🚀 运行示例

```bash
# 1. 基础工作流示例 - 展示简单的任务依赖和执行
npx tsx examples/basic-workflow.ts

# 2. 动态策略示例 - 展示四种动态策略的实际应用
npx tsx examples/dynamic-strategies.ts

# 3. LLM集成示例 - 展示AI驱动的工作流（模拟）
npx tsx examples/llm-integration.ts

# 4. 错误处理示例 - 展示容错机制和恢复策略
npx tsx examples/error-handling.ts

# 5. 流式工作流示例 - 展示实时流式数据返回
npx tsx examples/streaming-workflow.ts
```

### 📖 示例说明

| 示例文件 | 功能展示 | 学习要点 |
|---------|---------|----------|
| **basic-workflow.ts** | • 任务定义和依赖<br>• 工作流构建<br>• 结果获取 | 快速上手WorkflowBuilder基本用法 |
| **dynamic-strategies.ts** | • 4种动态策略<br>• 条件触发<br>• 智能任务生成 | 掌握动态工作流的核心功能 |
| **llm-integration.ts** | • AI任务规划<br>• 流式处理<br>• 智能决策 | 了解LLM驱动的工作流应用 |
| **error-handling.ts** | • 错误处理<br>• 恢复策略<br>• 容错机制 | 学习构建健壮的工作流系统 |
| **streaming-workflow.ts** | • 实时流式执行<br>• 前端友好返回<br>• 进度可视化 | 掌握流式工作流实现和前端集成 |

### 🎯 快速体验

如果你想快速体验所有示例，可以运行：

```bash
# 安装依赖
npm install

# 依次运行所有示例
npm run examples
```

或者创建一个简单的脚本来运行：

```bash
# 创建运行脚本
cat > run-examples.sh << 'EOF'
#!/bin/bash
echo "🚀 运行WorkflowBuilder示例"
echo "========================="

echo -e "\n1️⃣ 基础工作流示例"
npx tsx examples/basic-workflow.ts

echo -e "\n2️⃣ 动态策略示例" 
npx tsx examples/dynamic-strategies.ts

echo -e "\n3️⃣ LLM集成示例"
npx tsx examples/llm-integration.ts

echo -e "\n4️⃣ 错误处理示例"
npx tsx examples/error-handling.ts

echo -e "\n5️⃣ 流式工作流示例"
npx tsx examples/streaming-workflow.ts

echo -e "\n✅ 所有示例运行完成！"
EOF

chmod +x run-examples.sh
./run-examples.sh
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT © [FormAgent](https://github.com/FormAgent)

---

## 🎉 重构成果

本次重构实现了：
- **90%+ 使用复杂度降低** - 从5步构造到1行调用
- **100% 功能保留** - 所有原有功能完整保留
- **显著性能提升** - 优化的算法和执行引擎  
- **增强的动态能力** - 多种智能策略支持
- **完整类型安全** - 全面的TypeScript支持
- **代码库精简** - 移除90%+旧架构代码，保持核心功能

### 🧹 **架构精简**

**删除的旧架构文件:**
- `LLMTaskPlanner.ts` - 功能整合到WorkflowBuilder
- `DynamicDAG.ts` - 被动态策略系统替代
- `DAG.ts` - 功能内置到WorkflowBuilder
- `TaskExecutor.ts` - 执行逻辑内置化
- `Workflow.ts` - 被新的Workflow接口替代
- `StreamingTask.ts` - 流式功能整合

**保留的核心文件:**
- `WorkflowBuilder.ts` - 新的统一核心系统 (16KB)
- `TaskRegistry.ts` - 任务注册管理 (1KB)
- `ContextManager.ts` - 上下文管理 (670B)
- `Task.ts` - 基础任务接口 (705B)

**测试文件精简:**
- 从15+个测试文件精简到3个核心测试套件
- 保持100%测试覆盖率和58个测试用例
- 所有测试通过，功能完整验证

让工作流开发更简单、更强大、更智能！ 🚀

## 🌊 流式工作流 - 实时用户体验

### 什么是流式工作流？

传统工作流需要等待所有任务完成才返回结果，而流式工作流可以实时返回执行过程中的数据，特别适合：
- 长时间运行的LLM任务
- 需要实时反馈的场景
- 前端用户体验优化

### 基础流式任务实现

```typescript
class StreamingAnalysisTask {
  name = 'streamingAnalysis';
  isStreaming = true;

  // 普通执行方法（兼容性）
  async execute(input: any): Promise<Record<string, any>> {
    return { analysis: 'Static result', timestamp: Date.now() };
  }

  // 流式执行方法
  async *executeStream(input: any): AsyncGenerator<string, Record<string, any>, unknown> {
    // 模拟LLM流式响应
    yield '🔍 开始分析...';
    yield '📊 检测项目类型...';
    yield '⚡ 生成优化建议...';
    yield '✅ 分析完成';
    
    return { 
      analysis: 'Complete analysis data',
      timestamp: Date.now() 
    };
  }
}
```

### 流式工作流使用

```typescript
import { SimpleStreamingWorkflow } from './examples/streaming-workflow';

const streamingWorkflow = new SimpleStreamingWorkflow()
  .addTask(new StreamingAnalysisTask())
  .addTask(new StreamingOptimizationTask());

// 🌊 流式执行
for await (const chunk of streamingWorkflow.executeStream(input)) {
  switch (chunk.type) {
    case 'progress':
      console.log(`进度: ${chunk.progress}%`);
      break;
    case 'data':
      console.log(`数据: ${chunk.content}`);
      break;
    case 'complete':
      console.log(`任务完成: ${chunk.taskName}`);
      break;
  }
}
```

### 前端集成示例

#### 1. 服务端 (Express + SSE)
```typescript
app.get('/api/workflow/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const workflow = new SimpleStreamingWorkflow()
    .addTask(new StreamingCodeAnalysisTask());

  for await (const chunk of workflow.executeStream(req.body)) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }
  
  res.end();
});
```

#### 2. 前端 (React)
```tsx
function WorkflowProgress() {
  const [messages, setMessages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const startWorkflow = () => {
    const eventSource = new EventSource('/api/workflow/stream');
    
    eventSource.onmessage = (event) => {
      const chunk = JSON.parse(event.data);
      
      if (chunk.type === 'progress') {
        setProgress(chunk.progress);
      } else if (chunk.type === 'data') {
        setMessages(prev => [...prev, chunk.content]);
      }
    };
  };

  return (
    <div>
      <button onClick={startWorkflow}>开始分析</button>
      <progress value={progress} max={100} />
      <div>
        {messages.map((msg, i) => 
          <div key={i} className="message">{msg}</div>
        )}
      </div>
    </div>
  );
}
```

#### 3. 前端 (Vue)
```vue
<template>
  <div>
    <button @click="startWorkflow" :disabled="isRunning">
      {{ isRunning ? '执行中...' : '开始分析' }}
    </button>
    <progress :value="progress" max="100"></progress>
    <div v-for="(msg, i) in messages" :key="i" class="message">
      {{ msg }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const messages = ref([]);
const progress = ref(0);
const isRunning = ref(false);

const startWorkflow = async () => {
  isRunning.value = true;
  messages.value = [];
  progress.value = 0;

  const response = await fetch('/api/workflow/stream');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'progress') {
            progress.value = data.progress;
          } else if (data.type === 'data') {
            messages.value.push(data.content);
          }
        }
      }
    }
  } finally {
    isRunning.value = false;
  }
};
</script>
```

### 流式工作流的优势

- **✨ 实时反馈** - 用户立即看到执行进度
- **🚀 长任务支持** - 适合耗时的LLM分析
- **📊 进度可视化** - 清晰的进度条和状态
- **🔄 可中断恢复** - 支持暂停和继续
- **💬 实时响应** - LLM流式输出直接展示
- **🎯 前端友好** - 完美的用户体验

### 数据格式

流式工作流返回标准化的数据块：

```typescript
interface StreamingChunk {
  type: 'progress' | 'data' | 'error' | 'complete';
  taskName: string;
  content?: any;
  progress?: number;        // 0-100
  timestamp: number;
  metadata?: Record<string, any>;
}
```

通过流式工作流，你可以为用户提供类似ChatGPT的实时响应体验！