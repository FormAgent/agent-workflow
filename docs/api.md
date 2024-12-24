# API Documentation

## Table of Contents
- [API Documentation](#api-documentation)
  - [Table of Contents](#table-of-contents)
  - [Core Classes](#core-classes)
    - [DAGWorkflowEngine](#dagworkflowengine)
    - [Event System](#event-system)
    - [WorkflowEngine](#workflowengine)
    - [TaskExecutor](#taskexecutor)
    - [ContextManager](#contextmanager)
  - [Interfaces](#interfaces)
    - [Task](#task)
    - [DAGTask](#dagtask)
    - [WorkflowDefinition](#workflowdefinition)
  - [Types](#types)
    - [TaskInput/TaskOutput](#taskinputtaskoutput)
    - [TaskStatus](#taskstatus)
    - [Schema Validation](#schema-validation)
  - [Usage Examples](#usage-examples)
    - [DAG Workflow Example](#dag-workflow-example)
    - [Conditional Branch Example](#conditional-branch-example)
    - [Error Handling Example](#error-handling-example)

## Core Classes

### DAGWorkflowEngine
DAG workflow engine for executing DAG-based task flows.

```typescript
class DAGWorkflowEngine {
  constructor(executor: TaskExecutor);
  
  // Run DAG workflow
  async run(dag: DAG): Promise<void>;
  
  // Get task status
  getTaskStatus(task: DAGTask): TaskStatus;
  
  // Event listening
  on(event: 'taskStatusChanged', handler: (task: DAGTask, status: TaskStatus) => void): void;
}
```

### Event System
```typescript
type TaskStatusEvent = {
  task: DAGTask;
  status: TaskStatus;
}
```

### WorkflowEngine
Base workflow engine supporting sequential execution, conditional branching, and parallel tasks.

```typescript
class WorkflowEngine {
  constructor(executor: TaskExecutor);
  
  // Run workflow
  async run(workflow: WorkflowDefinition): Promise<void>;
}
```

### TaskExecutor
Task executor responsible for actual task execution and context management.

```typescript
class TaskExecutor {
  constructor(contextManager: ContextManager);
  
  // Execute single task
  async execute(task: Task): Promise<void>;
  
  // Get context manager
  getContext(): ContextManager;
}
```

### ContextManager
Context manager handling data sharing between tasks.

```typescript
class ContextManager {
  // Set context data
  set(key: string, value: any): void;
  
  // Get context data
  get(key: string): any;
  
  // Get all context data
  getAll(): Record<string, any>;
  
  // Clear context
  clear(): void;
}
```

## Interfaces

### Task
Base task interface.

```typescript
interface Task {
  name: string;
  // Optional input/output schema validation
  inputSchema?: ZodSchema;
  outputSchema?: ZodSchema;
  execute(input: TaskInput): Promise<TaskOutput>;
}
```

### DAGTask
DAG task interface extending base task interface.

```typescript
interface DAGTask extends Task {
  // Task dependencies
  dependsOn?: DAGTask[];
  
  // Conditional branches
  branches?: {
    condition: (context: ContextManager) => boolean;
    next: DAGTask | DAGTask[];
  }[];
  
  // Default branch
  defaultNext?: DAGTask | DAGTask[];
  
  // Error handling
  onError?: (error: Error, context: ContextManager) => Promise<void>;
  
  // Retry count
  retryCount?: number;
}
```

### WorkflowDefinition
Workflow definition interface.

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

## Types

### TaskInput/TaskOutput
Task input/output types.

```typescript
type TaskInput = Record<string, any>;
type TaskOutput = Record<string, any>;
```

### TaskStatus
Task status enumeration.

```typescript
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
```

### Schema Validation
Tasks can optionally define input and output schemas using Zod:

```typescript
import { z } from 'zod';

class WeatherTask implements DAGTask {
  name = 'WeatherTask';
  
  // Define input schema
  inputSchema = z.object({
    rawData: z.string(),
    cleanedData: z.string().optional(),
    intent: z.string().optional(),
  });

  // Define output schema
  outputSchema = z.object({
    weatherInfo: z.object({
      temperature: z.string(),
      condition: z.string(),
    }),
  });

  async execute(input: TaskInput) {
    // Input validation
    const validatedInput = this.inputSchema.parse(input);
    
    // Task logic
    const output = {
      ...input,
      weatherInfo: { temperature: '25°C', condition: 'Sunny' },
    };

    // Output validation
    return this.outputSchema.parse(output);
  }
}
```

Schema validation ensures:
- Input data meets the expected format before task execution
- Output data conforms to the specified structure
- Runtime type safety and automatic error handling

## Usage Examples

### DAG Workflow Example

```typescript
import { DAGWorkflowEngine, TaskExecutor, ContextManager, type DAGTask } from 'dag-workflow';

// Define tasks
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

// Create and run workflow
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

### Conditional Branch Example

```typescript
import type { DAGTask, ContextManager } from 'dag-workflow';

class ConditionalTask implements DAGTask {
  name = 'ConditionalTask';
  retryCount = 3; // Retry 3 times on failure
  
  branches = [{
    condition: (ctx: ContextManager) => ctx.get('value') > 5,
    next: new TaskB()
  }];
  
  defaultNext = new TaskC();
  
  async execute(input) {
    // Processing logic
    return input;
  }
}
```

### Error Handling Example

```typescript
class RetryableTask implements DAGTask {
  name = 'RetryableTask';
  retryCount = 3;
  
  async onError(error: Error, context: ContextManager) {
    context.set('lastError', error.message);
    // Error handling logic
  }
  
  async execute(input) {
    // Task logic that might throw errors
    return input;
  }
}
``` 