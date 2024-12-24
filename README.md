# DAG Workflow Engine

A powerful workflow engine that supports DAG (Directed Acyclic Graph) task scheduling with conditional branching, parallel execution, and context management.

[中文文档](./README.zh.md)

## Features

- 🔄 DAG Task Scheduling
  - Complex task dependency support
  - Automatic cycle detection
  - Multi-level task execution
  - Task retry mechanism
  
- 🔀 Conditional Branching
  - Dynamic condition evaluation
  - Multiple branch path selection
  - Default branch support
  
- ⚡ Parallel Execution
  - Same-level task parallelization
  - Multi-task combination support
  
- 📦 Context Management
  - Inter-task data sharing
  - Dynamic context updates
  - Status tracking
  - Task status change notifications

## Installation

```bash
npm install dag-workflow
# or
yarn add dag-workflow
# or
pnpm add dag-workflow
```

## Quick Start

### Basic Example: Weather Query Workflow

```typescript
import { 
  DAGWorkflowEngine, 
  TaskExecutor, 
  ContextManager,
  type DAGTask,
  type TaskInput 
} from 'dag-workflow';

// 1. Define Tasks
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
      weatherInfo: { temperature: '25°C', condition: 'Sunny' },
    };
  }
}

class DefaultTask implements DAGTask {
  name = 'DefaultTask';
  async execute(input: TaskInput) {
    return {
      ...input,
      defaultResponse: "I'm sorry, I don't understand your request.",
    };
  }
}

// 2. Create Workflow
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

// 3. Run Workflow
const context = new ContextManager();
const executor = new TaskExecutor(context);
const engine = new DAGWorkflowEngine(executor);

// Listen to task status changes
engine.on('taskStatusChanged', (task, status) => {
  console.log(`Task ${task.name} status: ${status}`);
});

// Set initial data and run
context.set('rawData', 'what is the weather today');
await engine.run(workflowDefinition);

// Get result
console.log(context.get('weatherInfo')); // { temperature: '25°C', condition: 'Sunny' }
```

### Complex Example: Multi-Level Conditional Tasks

```typescript
import type { DAGTask, ContextManager } from 'dag-workflow';

// Define tasks for different processing paths
class TaskA implements DAGTask {
  name = 'TaskA';
  async execute(input: TaskInput) {
    // Initial processing
    return { ...input, valueA: 'processed' };
  }
}

class TaskB implements DAGTask {
  name = 'TaskB';
  dependsOn = [taskA]; // Depends on TaskA
  async execute(input: TaskInput) {
    // Process path B
    return { ...input, valueB: 'processed' };
  }
}

class TaskC implements DAGTask {
  name = 'TaskC';
  dependsOn = [taskA]; // Depends on TaskA
  async execute(input: TaskInput) {
    // Process path C
    return { ...input, valueC: 'processed' };
  }
}

// Create conditional task
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

// Create DAG
const dag = {
  tasks: [taskA, conditionalTask, taskB, taskC],
};

// Run workflow
const context = new ContextManager();
context.set('value', 10); // This will trigger taskB path
const executor = new TaskExecutor(context);
const engine = new DAGWorkflowEngine(executor);
await engine.run(dag);
```

## API Documentation

For detailed API documentation, please refer to [API Documentation](./docs/api.md)

## Testing

```bash
pnpm test
```

## Build

```bash
pnpm build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT © [baryon](https://github.com/baryon)