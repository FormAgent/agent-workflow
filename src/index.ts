// 新的WorkflowBuilder架构导出
export { WorkflowBuilder } from './workflow/WorkflowBuilder';
export type {
  WorkflowConfig,
  DynamicStrategy,
  Workflow,
  WorkflowResult,
  TaskExecutionResult,
  DAGTask,
  StreamingDAGTask,
  StreamChunk,
  StreamingWorkflowResult,
  StreamingWorkflow,
} from './workflow/WorkflowBuilder';

// 任务系统导出
export { TaskRegistry } from './workflow/TaskRegistry';
export type { Task, TaskInput, TaskOutput } from './workflow/Task';

// 上下文管理导出
export { ContextManager } from './workflow/ContextManager';
