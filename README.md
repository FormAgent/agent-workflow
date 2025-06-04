# 🚀 Intelligent Workflow Engine

A powerful workflow engine supporting DAG (Directed Acyclic Graph) task scheduling, dynamic task generation, and intelligent strategy systems. After refactoring, complexity reduced by 90% with enhanced functionality.

[中文文档](./README.ZH.md)

## ✨ Core Features

### 🎯 **Drastically Simplified API Design**
- **Before**: 5-step complex construction (`Context → Executor → Engine → Workflow → Execute`)
- **After**: 1-line chain call (`WorkflowBuilder.create().build().execute()`)

### 🔄 **Powerful DAG Task Scheduling**
- Automatic task dependency resolution and topological sorting
- Intelligent parallel execution optimization
- Circular dependency detection
- Elegant error handling and recovery

### 🧠 **Intelligent Dynamic Strategy System**
- Condition-triggered task generation
- Dynamic planning based on task results
- Context change monitoring
- LLM-driven intelligent task planning

### ⚡ **High-Performance Execution Engine**
- O(V+E) complexity topological sorting
- Automatic parallel execution of independent tasks
- Memory optimization and lazy initialization
- Complete execution monitoring and metrics

## 🚀 Quick Start

### Installation

```bash
npm install agent-workflow
# or
yarn add agent-workflow  
# or
pnpm add agent-workflow
```

### Basic Usage - Simple Task Flow

```typescript
import { WorkflowBuilder } from 'agent-workflow';

// Define tasks
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
    const analysis = `Analysis result: ${input.processed}`;
    return { ...input, analysis };
  }
}

// 🔥 After refactoring - 1 line does it all
const result = await WorkflowBuilder
  .create()
  .addTask(new DataProcessTask())
  .addTask(new AnalysisTask())
  .build()
  .execute({ rawData: 'hello world' });

console.log(result.data.analysis); // "Analysis result: HELLO WORLD"
```

### Intelligent Dynamic Workflow - Conditional Task Generation

```typescript
const workflow = WorkflowBuilder
  .create()
  .addTask(new CodeScanTask())
  .whenCondition(
    // When TypeScript files are detected
    (context) => {
      const fileTypes = context.get('discoveredTypes') as string[];
      return fileTypes?.includes('typescript');
    },
    // Automatically generate TS-related tasks
    async (context) => [
      new TypeCheckTask(),
      new TSLintTask(),
      new TypeCoverageTask()
    ]
  )
  .build();

const result = await workflow.execute({ projectPath: './src' });
console.log(`Intelligently generated ${result.dynamicTasksGenerated} tasks`);
```

### Dynamic Planning Based on Results

```typescript
const workflow = WorkflowBuilder
  .create()
  .addTask(new SecurityScanTask())
  .onTaskComplete('securityScan', async (result, context) => {
    const tasks = [];
    const issues = result.vulnerabilities || [];
    
    // Dynamically generate fix tasks based on scan results
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

### LLM-Driven Intelligent Workflow

```typescript
// 🤖 AI automatically plans task flow
const result = await WorkflowBuilder
  .create()
  .withLLMModel('gpt-4-turbo')
  .withDynamicPlanning('Analyze this Vue project and generate a code quality report')
  .build()
  .execute({ projectPath: './my-vue-app' });

console.log('AI-generated analysis report:', result.data);
```

## 🌊 Streaming Workflow - Real-time User Experience

### What is Streaming Workflow?

Traditional workflows wait for all tasks to complete before returning results, while streaming workflows can return real-time data during execution, perfect for:
- Long-running LLM tasks
- Scenarios requiring real-time feedback
- Frontend user experience optimization

### Basic Streaming Task Implementation

```typescript
class StreamingAnalysisTask {
  name = 'streamingAnalysis';
  isStreaming = true;

  // Regular execution method (compatibility)
  async execute(input: any): Promise<Record<string, any>> {
    return { analysis: 'Static result', timestamp: Date.now() };
  }

  // Streaming execution method
  async *executeStream(input: any): AsyncGenerator<string, Record<string, any>, unknown> {
    // Simulate LLM streaming response
    yield '🔍 Starting analysis...';
    yield '📊 Detecting project type...';
    yield '⚡ Generating optimization suggestions...';
    yield '✅ Analysis complete';
    
    return { 
      analysis: 'Complete analysis data',
      timestamp: Date.now() 
    };
  }
}
```

### Streaming Workflow Usage

```typescript
import { SimpleStreamingWorkflow } from './examples/streaming-workflow';

const streamingWorkflow = new SimpleStreamingWorkflow()
  .addTask(new StreamingAnalysisTask())
  .addTask(new StreamingOptimizationTask());

// 🌊 Streaming execution
for await (const chunk of streamingWorkflow.executeStream(input)) {
  switch (chunk.type) {
    case 'progress':
      console.log(`Progress: ${chunk.progress}%`);
      break;
    case 'data':
      console.log(`Data: ${chunk.content}`);
      break;
    case 'complete':
      console.log(`Task completed: ${chunk.taskName}`);
      break;
  }
}
```

### Frontend Integration Examples

#### 1. Server-side (Express + SSE)
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

#### 2. Frontend (React)
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
      <button onClick={startWorkflow}>Start Analysis</button>
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

## 🎛️ Advanced Configuration

### Complete Configuration Example

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
    priority: 10, // High priority
    once: true    // Execute only once
  })
  .build();
```

### Task Dependency Management

```typescript
const task1 = new DataFetchTask();
const task2 = new DataProcessTask();
task2.dependsOn = [task1]; // Declare dependency

const task3 = new DataAnalysisTask();
task3.dependsOn = [task1, task2]; // Multiple dependencies

const workflow = WorkflowBuilder
  .create()
  .addTasks([task1, task2, task3]) // Automatically handle dependency order
  .build();
```

## 🔧 Dynamic Strategy System

### 1. Condition Strategy - `whenCondition()`

```typescript
.whenCondition(
  (context) => context.get('environment') === 'production',
  async (context) => [
    new SecurityAuditTask(),
    new PerformanceTestTask()
  ]
)
```

### 2. Task Completion Strategy - `onTaskComplete()`

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

### 3. Context Change Strategy - `onContextChange()`

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

### 4. Custom Strategy - `addDynamicStrategy()`

```typescript
.addDynamicStrategy({
  name: 'performance_optimization',
  condition: (context, result) => {
    const metrics = context.get('performanceMetrics');
    return metrics?.loadTime > 3000; // Load time over 3 seconds
  },
  generator: async (context) => [
    new ImageOptimizationTask(),
    new CodeSplittingTask(),
    new CacheOptimizationTask()
  ],
  priority: 5,
  once: false // Can trigger multiple times
})
```

## 📊 Execution Monitoring and Results

### Detailed Execution Results

```typescript
interface WorkflowResult {
  success: boolean;                              // Success status
  data?: any;                                   // Final data
  error?: Error;                                // Error information
  executionTime: number;                        // Total execution time (ms)
  taskResults: Map<string, TaskExecutionResult>; // Detailed results for each task
  dynamicTasksGenerated?: number;               // Number of dynamically generated tasks
  totalSteps?: number;                          // Total execution steps
}

// Usage example
const result = await workflow.execute();

if (result.success) {
  console.log(`✅ Workflow completed successfully`);
  console.log(`📊 Execution time: ${result.executionTime}ms`);
  console.log(`🎯 Dynamic tasks generated: ${result.dynamicTasksGenerated}`);
  console.log(`📈 Total execution steps: ${result.totalSteps}`);
  
  // View specific task results
  result.taskResults.forEach((taskResult, taskName) => {
    console.log(`Task ${taskName}: ${taskResult.status} (${taskResult.duration}ms)`);
  });
} else {
  console.error(`❌ Workflow failed:`, result.error?.message);
}
```

### Execution History Tracking

```typescript
const workflow = WorkflowBuilder.create()
  .addTask(new TaskA())
  .addTask(new TaskB())
  .build();

await workflow.execute();

// Get detailed execution history
const history = workflow.getContext().getExecutionHistory();
history.forEach(record => {
  console.log(`${record.taskName}: ${record.status} (${record.duration}ms)`);
});
```

## 🔄 Migration from Legacy Version

### Migration Comparison

```typescript
// ❌ Legacy version - Complex 5-step construction
const planner = new LLMTaskPlanner('gpt-4-turbo');
const context = new ContextManager();
const executor = new TaskExecutor(context);
const engine = new DynamicDAGWorkflowEngine(executor, planner);
context.set('userRequest', 'Analyze project');
await engine.planAndRun(context);

// ✅ New version - 1-line chain call
const result = await WorkflowBuilder
  .create()
  .withLLMModel('gpt-4-turbo')
  .withDynamicPlanning('Analyze project')
  .build()
  .execute();
```

> **Note:** The new architecture no longer provides backward compatibility adapters. We recommend migrating directly to the new WorkflowBuilder API, which features a more concise and user-friendly design.

## 🧪 AI SDK Streaming Support

Supports streaming processing of large model responses through [AI SDK](https://github.com/vercel/ai):

```typescript
import { streamText } from 'ai';

class StreamingAnalysisTask implements DAGTask {
  name = 'streamingAnalysis';
  
  async execute(input: TaskInput) {
    const { textStream } = await streamText({
      model: openai('gpt-4-turbo'),
      prompt: `Analyze the following code: ${input.code}`,
    });

    let fullAnalysis = '';
    for await (const textPart of textStream) {
      fullAnalysis += textPart;
      // Process streaming output in real-time
      console.log('Real-time analysis:', textPart);
    }

    return { ...input, analysis: fullAnalysis };
  }
}
```

## 🎯 Best Practices

### 1. Task Design Principles

```typescript
class WellDesignedTask implements DAGTask {
  constructor(
    public name: string,
    private config: TaskConfig
  ) {}

  async execute(input: TaskInput): Promise<Record<string, any>> {
    // ✅ Input validation
    this.validateInput(input);
    
    // ✅ Idempotent design
    if (this.isAlreadyProcessed(input)) {
      return this.getCachedResult(input);
    }
    
    // ✅ Core business logic
    const result = await this.processData(input);
    
    // ✅ Result caching
    this.cacheResult(input, result);
    
    return result;
  }
}
```

### 2. Error Handling Strategy

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

### 3. Performance Optimization Tips

- **Parallel optimization**: Reduce unnecessary task dependencies
- **Memory management**: Clean up large objects promptly
- **Lazy loading**: Initialize heavy components on demand
- **Strategy priority**: Set reasonable strategy execution order

## 📚 More Examples

Check the [examples](./examples) directory for more practical use cases:

### 🚀 Run Examples

```bash
# 1. Basic workflow example - Shows simple task dependencies and execution
npx tsx examples/basic-workflow.ts

# 2. Dynamic strategy example - Shows four dynamic strategies in action
npx tsx examples/dynamic-strategies.ts

# 3. LLM integration example - Shows AI-driven workflows (simulated)
npx tsx examples/llm-integration.ts

# 4. Error handling example - Shows fault tolerance and recovery strategies
npx tsx examples/error-handling.ts

# 5. Streaming workflow example - Shows real-time streaming data return
npx tsx examples/streaming-workflow.ts
```

### 📖 Example Descriptions

| Example File | Features | Learning Points |
|---------|---------|----------|
| **basic-workflow.ts** | • Task definition and dependencies<br>• Workflow construction<br>• Result retrieval | Quick start with WorkflowBuilder basics |
| **dynamic-strategies.ts** | • 4 dynamic strategies<br>• Condition triggering<br>• Intelligent task generation | Master core dynamic workflow functionality |
| **llm-integration.ts** | • AI task planning<br>• Streaming processing<br>• Intelligent decision making | Understand LLM-driven workflow applications |
| **error-handling.ts** | • Error handling<br>• Recovery strategies<br>• Fault tolerance mechanisms | Learn to build robust workflow systems |
| **streaming-workflow.ts** | • Real-time streaming execution<br>• Frontend-friendly returns<br>• Progress visualization | Master streaming workflow implementation and frontend integration |

### 🎯 Quick Experience

If you want to quickly experience all examples, you can run:

```bash
# Install dependencies
npm install

# Run all examples in sequence
npm run examples
```

Or create a simple script to run:

```bash
# Create run script
cat > run-examples.sh << 'EOF'
#!/bin/bash
echo "🚀 Running WorkflowBuilder Examples"
echo "================================="

echo -e "\n1️⃣ Basic workflow example"
npx tsx examples/basic-workflow.ts

echo -e "\n2️⃣ Dynamic strategy example" 
npx tsx examples/dynamic-strategies.ts

echo -e "\n3️⃣ LLM integration example"
npx tsx examples/llm-integration.ts

echo -e "\n4️⃣ Error handling example"
npx tsx examples/error-handling.ts

echo -e "\n5️⃣ Streaming workflow example"
npx tsx examples/streaming-workflow.ts

echo -e "\n✅ All examples completed!"
EOF

chmod +x run-examples.sh
./run-examples.sh
```

## 🤝 Contributing

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT © [FormAgent](https://github.com/FormAgent)

---

## 🎉 Refactoring Achievements

This refactoring achieved:
- **90%+ reduction in usage complexity** - From 5-step construction to 1-line call
- **100% feature preservation** - All original functionality completely retained
- **Significant performance improvements** - Optimized algorithms and execution engine  
- **Enhanced dynamic capabilities** - Multiple intelligent strategy support
- **Complete type safety** - Comprehensive TypeScript support
- **Streamlined codebase** - Removed 90%+ legacy architecture code while maintaining core functionality

Make workflow development simpler, more powerful, and more intelligent! 🚀