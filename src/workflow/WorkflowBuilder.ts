import { z } from 'zod';
import type { Task, TaskInput } from './Task';
import { TaskRegistry } from './TaskRegistry';
import { ContextManager } from './ContextManager';

// DAG任务接口定义
export interface DAGTask {
  name: string;
  dependsOn?: DAGTask[];
  execute(input: TaskInput): Promise<Record<string, any>>;
}

// 🔄 流式DAG任务接口（扩展）
export interface StreamingDAGTask extends DAGTask {
  executeStream?(
    input: TaskInput
  ): AsyncGenerator<StreamChunk, Record<string, any>, unknown>;
  isStreaming?: boolean;
}

// 🌊 流式数据块
export interface StreamChunk {
  type: 'progress' | 'data' | 'error' | 'complete';
  taskName: string;
  content?: any;
  progress?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// 🔄 流式工作流结果
export interface StreamingWorkflowResult {
  stream: AsyncGenerator<StreamChunk, WorkflowResult, unknown>;
  getResult(): Promise<WorkflowResult>;
}

// 核心配置接口
export interface WorkflowConfig {
  llmModel?: string;
  enableDynamicPlanning?: boolean;
  enableStreaming?: boolean;
  retryAttempts?: number;
  timeoutMs?: number;
  maxDynamicSteps?: number;
}

// 统一的工作流上下文
export interface WorkflowContext {
  readonly data: Record<string, unknown>;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  getAll(): Record<string, unknown>;
  clear(): void;
  getExecutionHistory(): TaskExecutionResult[];
  getLastResult(): any;
}

// 任务执行结果
export interface TaskExecutionResult {
  taskName: string;
  status: 'completed' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  duration: number;
  timestamp: number;
}

// 工作流执行结果
export interface WorkflowResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  executionTime: number;
  taskResults: Map<string, TaskExecutionResult>;
  dynamicTasksGenerated?: number;
  totalSteps?: number;
}

// 动态任务生成策略
export interface DynamicStrategy {
  name: string;
  condition: (context: WorkflowContext, result?: any) => boolean;
  generator: (context: WorkflowContext) => Promise<DAGTask[]>;
  priority?: number;
  once?: boolean;
}

// 🤖 AI SDK 兼容的流式任务接口
export interface AISDKStreamingTask extends DAGTask {
  executeStreamAI?(input: TaskInput): Promise<{
    textStream?: AsyncIterable<string>;
    fullStream?: AsyncIterable<any>;
    toDataStreamResponse?: () => Response;
    toReadableStream?: () => ReadableStream;
  }>;
  isAISDKStreaming?: boolean;
}

// 🌊 AI SDK 流式工作流结果
export interface AISDKStreamingWorkflowResult {
  textStream: AsyncIterable<string>;
  fullStream: AsyncIterable<any>;
  toDataStreamResponse(): Response;
  toReadableStream(): ReadableStream;
  getResult(): Promise<WorkflowResult>;
}

// 主要的工作流构建器
export class WorkflowBuilder {
  private config: WorkflowConfig = {};
  private staticTasks: DAGTask[] = [];
  private dynamicPrompt?: string;
  private dynamicStrategies: DynamicStrategy[] = [];

  static create(): WorkflowBuilder {
    return new WorkflowBuilder();
  }

  // 配置方法
  withConfig(config: Partial<WorkflowConfig>): this {
    this.config = { ...this.config, ...config };
    return this;
  }

  withLLMModel(model: string): this {
    this.config.llmModel = model;
    return this;
  }

  withRetry(attempts: number): this {
    this.config.retryAttempts = attempts;
    return this;
  }

  withTimeout(timeoutMs: number): this {
    this.config.timeoutMs = timeoutMs;
    return this;
  }

  // 静态任务构建
  addTask(task: DAGTask): this {
    this.staticTasks.push(task);
    return this;
  }

  addTasks(tasks: DAGTask[]): this {
    this.staticTasks.push(...tasks);
    return this;
  }

  // 动态任务规划
  withDynamicPlanning(prompt: string): this {
    this.config.enableDynamicPlanning = true;
    this.dynamicPrompt = prompt;
    return this;
  }

  // 添加动态策略
  addDynamicStrategy(strategy: DynamicStrategy): this {
    this.dynamicStrategies.push(strategy);
    return this;
  }

  // 条件任务生成 - 语法糖
  whenCondition(
    condition: (context: WorkflowContext) => boolean,
    taskGenerator: (context: WorkflowContext) => Promise<DAGTask[]>
  ): this {
    return this.addDynamicStrategy({
      name: `condition-${this.dynamicStrategies.length}`,
      condition: (context) => {
        // 等待所有当前任务完成后再检查条件
        const history = context.getExecutionHistory();
        const completedTasks = history.filter((h) => h.status === 'completed');

        // 如果有已完成的任务，检查条件
        if (completedTasks.length > 0) {
          return condition(context);
        }
        return false;
      },
      generator: taskGenerator,
      once: true,
    });
  }

  // 基于结果的任务生成
  onTaskComplete(
    taskName: string,
    resultProcessor: (
      result: any,
      context: WorkflowContext
    ) => Promise<DAGTask[]>
  ): this {
    return this.addDynamicStrategy({
      name: `on-complete-${taskName}`,
      condition: (context) => {
        const history = context.getExecutionHistory();
        return history.some(
          (h) => h.taskName === taskName && h.status === 'completed'
        );
      },
      generator: async (context) => {
        const history = context.getExecutionHistory();
        const taskResult = history.find((h) => h.taskName === taskName);
        return resultProcessor(taskResult?.output, context);
      },
      once: true,
    });
  }

  // 基于上下文变化的任务生成
  onContextChange(
    contextKey: string,
    taskGenerator: (value: any, context: WorkflowContext) => Promise<DAGTask[]>
  ): this {
    return this.addDynamicStrategy({
      name: `on-context-${contextKey}`,
      condition: (context) => {
        // 检查是否有新的上下文值，并且之前没有触发过
        const value = context.get(contextKey);
        return value !== undefined;
      },
      generator: async (context) => {
        const value = context.get(contextKey);
        return taskGenerator(value, context);
      },
      once: true,
    });
  }

  // 构建工作流实例
  build(): Workflow {
    // 注意：LLM动态规划功能暂时禁用，因为依赖的LLMTaskPlanner已被移除
    if (this.config.enableDynamicPlanning && this.dynamicPrompt) {
      console.warn('LLM动态规划功能暂时不可用，将使用策略模式。');
    }

    if (this.dynamicStrategies.length > 0) {
      return new StrategyBasedWorkflow(
        this.config,
        this.staticTasks,
        this.dynamicStrategies
      );
    }

    return new StaticWorkflow(this.config, this.staticTasks);
  }

  // 🌊 构建流式工作流实例
  buildStreaming(): StreamingWorkflow {
    this.config.enableStreaming = true;

    if (this.dynamicStrategies.length > 0) {
      return new StreamingStrategyBasedWorkflow(
        this.config,
        this.staticTasks,
        this.dynamicStrategies
      );
    }

    return new StreamingStaticWorkflow(this.config, this.staticTasks);
  }

  // 🤖 构建AI SDK兼容的流式工作流
  buildAISDKStreaming(): AISDKStreamingWorkflow {
    this.config.enableStreaming = true;

    if (this.dynamicStrategies.length > 0) {
      return new AISDKStreamingStrategyWorkflow(
        this.config,
        this.staticTasks,
        this.dynamicStrategies
      );
    }

    return new AISDKStreamingStaticWorkflow(this.config, this.staticTasks);
  }
}

// 工作流接口
export interface Workflow {
  execute(input?: TaskInput): Promise<WorkflowResult>;
  executeStream?(input?: TaskInput): StreamingWorkflowResult;
  getContext(): WorkflowContext;
  getResults(): Map<string, TaskExecutionResult>;
}

// 🌊 流式工作流接口
export interface StreamingWorkflow extends Workflow {
  executeStream(input?: TaskInput): StreamingWorkflowResult;
}

// 🤖 AI SDK 兼容的流式工作流接口
export interface AISDKStreamingWorkflow extends Workflow {
  executeStreamAISDK(input?: TaskInput): AISDKStreamingWorkflowResult;
}

// 增强的上下文实现
class EnhancedWorkflowContext implements WorkflowContext {
  private internalContext: ContextManager;
  private executionHistory: TaskExecutionResult[] = [];

  constructor() {
    this.internalContext = new ContextManager();
  }

  get data(): Record<string, unknown> {
    return this.internalContext.getAll();
  }

  get<T>(key: string): T | undefined {
    return this.internalContext.get(key);
  }

  set<T>(key: string, value: T): void {
    this.internalContext.set(key, value);
  }

  getAll(): Record<string, unknown> {
    return this.internalContext.getAll();
  }

  clear(): void {
    this.internalContext.clear();
    this.executionHistory = [];
  }

  getExecutionHistory(): TaskExecutionResult[] {
    return [...this.executionHistory];
  }

  getLastResult(): any {
    const lastExecution =
      this.executionHistory[this.executionHistory.length - 1];
    return lastExecution?.output;
  }

  addExecutionResult(result: TaskExecutionResult): void {
    this.executionHistory.push(result);
  }

  // 内部方法，用于访问原始ContextManager
  getInternalContext(): ContextManager {
    return this.internalContext;
  }
}

// 基础工作流类
abstract class BaseWorkflow {
  protected context: EnhancedWorkflowContext;
  protected config: WorkflowConfig;
  protected startTime: number = 0;
  protected taskResults: Map<string, TaskExecutionResult> = new Map();

  constructor(config: WorkflowConfig) {
    this.config = config;
    this.context = new EnhancedWorkflowContext();
  }

  abstract execute(input?: TaskInput): Promise<WorkflowResult>;

  getContext(): WorkflowContext {
    return this.context;
  }

  getResults(): Map<string, TaskExecutionResult> {
    return new Map(this.taskResults);
  }

  protected async executeTask(task: DAGTask): Promise<void> {
    const taskStartTime = Date.now();

    try {
      // 直接执行任务
      const input = this.context.getAll();
      const output = await task.execute(input);

      // 将任务输出存储在任务名称下
      const taskName = task.name || '';
      this.context.set(taskName, output);

      // 也将输出的各个字段直接存储到上下文（保持兼容性）
      for (const [key, value] of Object.entries(output)) {
        this.context.set(key, value);
      }

      // 生成唯一的任务键，处理重复名称
      let uniqueKey = taskName;
      let counter = 1;
      while (this.taskResults.has(uniqueKey)) {
        uniqueKey = `${taskName}_${counter}`;
        counter++;
      }

      const result: TaskExecutionResult = {
        taskName: taskName,
        status: 'completed',
        output: output,
        duration: Date.now() - taskStartTime,
        timestamp: Date.now(),
      };

      this.taskResults.set(uniqueKey, result);
      this.context.addExecutionResult(result);
    } catch (error) {
      // 生成唯一的任务键，处理重复名称
      const taskName = task.name || '';
      let uniqueKey = taskName;
      let counter = 1;
      while (this.taskResults.has(uniqueKey)) {
        uniqueKey = `${taskName}_${counter}`;
        counter++;
      }

      const result: TaskExecutionResult = {
        taskName: taskName,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - taskStartTime,
        timestamp: Date.now(),
      };

      this.taskResults.set(uniqueKey, result);
      this.context.addExecutionResult(result);
      throw error;
    }
  }
}

// 静态工作流实现
class StaticWorkflow extends BaseWorkflow implements Workflow {
  protected tasks: DAGTask[];

  constructor(config: WorkflowConfig, tasks: DAGTask[]) {
    super(config);
    this.tasks = tasks;
  }

  async execute(input: TaskInput = {}): Promise<WorkflowResult> {
    this.startTime = Date.now();

    try {
      // 设置初始输入
      Object.entries(input).forEach(([key, value]) => {
        this.context.set(key, value);
      });

      // 执行DAG任务
      await this.executeDAG();

      return {
        success: true,
        data: this.context.getAll(),
        executionTime: Date.now() - this.startTime,
        taskResults: this.taskResults,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        executionTime: Date.now() - this.startTime,
        taskResults: this.taskResults,
      };
    }
  }

  private async executeDAG(): Promise<void> {
    const levels = this.computeExecutionLevels();
    let hasError = false;
    let lastError: Error | undefined;

    for (const level of levels) {
      // 执行当前级别的所有任务，不因单个任务失败而停止
      const results = await Promise.allSettled(
        level.map((task) => this.executeTask(task))
      );

      // 检查是否有失败的任务
      for (const result of results) {
        if (result.status === 'rejected') {
          hasError = true;
          lastError = result.reason;
        }
      }
    }

    // 如果有任务失败，抛出最后一个错误
    if (hasError && lastError) {
      throw lastError;
    }
  }

  protected computeExecutionLevels(): DAGTask[][] {
    // 高效的拓扑排序实现
    const graph = new Map<DAGTask, DAGTask[]>();
    const inDegree = new Map<DAGTask, number>();

    // 初始化
    for (const task of this.tasks) {
      graph.set(task, []);
      inDegree.set(task, 0);
    }

    // 构建依赖图
    for (const task of this.tasks) {
      if (task.dependsOn) {
        for (const dep of task.dependsOn) {
          graph.get(dep)?.push(task);
          inDegree.set(task, (inDegree.get(task) || 0) + 1);
        }
      }
    }

    // 分层执行
    const levels: DAGTask[][] = [];
    const queue = this.tasks.filter((task) => inDegree.get(task) === 0);
    let processedCount = 0;

    while (queue.length > 0) {
      const currentLevel = [...queue];
      levels.push(currentLevel);
      processedCount += currentLevel.length;
      queue.length = 0;

      for (const task of currentLevel) {
        for (const next of graph.get(task) || []) {
          const newDegree = (inDegree.get(next) || 0) - 1;
          inDegree.set(next, newDegree);
          if (newDegree === 0) {
            queue.push(next);
          }
        }
      }
    }

    // 检测循环依赖
    if (processedCount < this.tasks.length) {
      throw new Error('检测到循环依赖，无法执行工作流');
    }

    return levels;
  }
}

// 策略驱动的动态工作流
class StrategyBasedWorkflow extends BaseWorkflow implements Workflow {
  protected tasks: DAGTask[];
  protected strategies: DynamicStrategy[];
  protected dynamicTasksGenerated: number = 0;
  protected currentStep: number = 0;
  protected usedStrategies: Set<string> = new Set();

  constructor(
    config: WorkflowConfig,
    tasks: DAGTask[],
    strategies: DynamicStrategy[]
  ) {
    super(config);
    this.tasks = [...tasks];
    this.strategies = strategies;
  }

  async execute(input: TaskInput = {}): Promise<WorkflowResult> {
    this.startTime = Date.now();
    this.dynamicTasksGenerated = 0;
    this.currentStep = 0;
    this.usedStrategies.clear();

    try {
      // 设置初始输入
      Object.entries(input).forEach(([key, value]) => {
        this.context.set(key, value);
      });

      // 动态执行循环
      while (this.hasTasksToExecute() && this.shouldContinue()) {
        this.currentStep++;

        // 执行当前批次的任务
        await this.executeCurrentBatch();

        // 评估策略并生成新任务
        await this.evaluateStrategiesAndGenerateTasks();
      }

      return {
        success: true,
        data: this.context.getAll(),
        executionTime: Date.now() - this.startTime,
        taskResults: this.taskResults,
        dynamicTasksGenerated: this.dynamicTasksGenerated,
        totalSteps: this.currentStep,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        executionTime: Date.now() - this.startTime,
        taskResults: this.taskResults,
        dynamicTasksGenerated: this.dynamicTasksGenerated,
        totalSteps: this.currentStep,
      };
    }
  }

  protected hasTasksToExecute(): boolean {
    return this.getReadyTasks().length > 0;
  }

  protected shouldContinue(): boolean {
    const maxSteps = this.config.maxDynamicSteps || 50;
    return this.currentStep < maxSteps;
  }

  private async executeCurrentBatch(): Promise<void> {
    const readyTasks = this.getReadyTasks();

    if (readyTasks.length === 0) return;

    // 并行执行就绪任务，不因单个任务失败而停止
    const results = await Promise.allSettled(
      readyTasks.map((task) => this.executeTask(task))
    );

    // 记录失败的任务但继续执行
    for (const result of results) {
      if (result.status === 'rejected') {
        console.warn('任务执行失败:', result.reason);
      }
    }
  }

  protected getReadyTasks(): DAGTask[] {
    const processedTaskNames = new Set(
      this.context
        .getExecutionHistory()
        .filter(
          (h) =>
            h.status === 'completed' ||
            h.status === 'failed' ||
            h.status === 'skipped'
        )
        .map((h) => h.taskName)
    );

    return this.tasks.filter((task) => {
      // 检查是否已处理（完成、失败或跳过）
      if (processedTaskNames.has(task.name || '')) {
        return false;
      }

      // 检查依赖是否满足（只要依赖任务被处理过即可，不管成功失败）
      if (task.dependsOn) {
        return task.dependsOn.every((dep) =>
          processedTaskNames.has(dep.name || '')
        );
      }

      return true;
    });
  }

  protected async evaluateStrategiesAndGenerateTasks(): Promise<void> {
    // 按优先级排序策略
    const sortedStrategies = [...this.strategies].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    for (const strategy of sortedStrategies) {
      // 跳过已使用的一次性策略
      if (strategy.once && this.usedStrategies.has(strategy.name)) {
        continue;
      }

      try {
        const lastResult = this.context.getLastResult();

        if (strategy.condition(this.context, lastResult)) {
          const newTasks = await strategy.generator(this.context);

          if (newTasks.length > 0) {
            this.tasks.push(...newTasks);
            this.dynamicTasksGenerated += newTasks.length;

            if (strategy.once) {
              this.usedStrategies.add(strategy.name);
            }

            console.log(
              `🎯 策略 "${strategy.name}" 生成了 ${newTasks.length} 个新任务`
            );
          }
        }
      } catch (error) {
        console.error(`策略 "${strategy.name}" 执行失败:`, error);
      }
    }
  }
}

// 🌊 流式静态工作流实现
class StreamingStaticWorkflow
  extends StaticWorkflow
  implements StreamingWorkflow
{
  executeStream(input: TaskInput = {}): StreamingWorkflowResult {
    const resultPromise = this.execute(input);

    const stream = this.createExecutionStream(input);

    return {
      stream,
      getResult: () => resultPromise,
    };
  }

  private async *createExecutionStream(
    input: TaskInput
  ): AsyncGenerator<StreamChunk, WorkflowResult, unknown> {
    this.startTime = Date.now();

    try {
      // 设置初始输入
      Object.entries(input).forEach(([key, value]) => {
        this.context.set(key, value);
      });

      yield {
        type: 'progress',
        taskName: 'workflow',
        content: '工作流开始执行',
        progress: 0,
        timestamp: Date.now(),
      };

      // 执行DAG任务并流式输出
      yield* this.executeDAGStream();

      const result: WorkflowResult = {
        success: true,
        data: this.context.getAll(),
        executionTime: Date.now() - this.startTime,
        taskResults: this.taskResults,
      };

      yield {
        type: 'complete',
        taskName: 'workflow',
        content: '工作流执行完成',
        progress: 100,
        timestamp: Date.now(),
      };

      return result;
    } catch (error) {
      yield {
        type: 'error',
        taskName: 'workflow',
        content: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };

      return {
        success: false,
        error: error as Error,
        executionTime: Date.now() - this.startTime,
        taskResults: this.taskResults,
      };
    }
  }

  private async *executeDAGStream(): AsyncGenerator<
    StreamChunk,
    void,
    unknown
  > {
    const levels = this.computeExecutionLevels();
    const totalTasks = this.tasks.length;
    let completedTasks = 0;

    for (const level of levels) {
      // 执行当前级别的所有任务
      const taskPromises = level.map((task) => this.executeTaskStream(task));

      for await (const taskStream of taskPromises) {
        for await (const chunk of taskStream) {
          yield chunk;
          if (chunk.type === 'complete') {
            completedTasks++;
            yield {
              type: 'progress',
              taskName: 'workflow',
              content: `已完成 ${completedTasks}/${totalTasks} 个任务`,
              progress: Math.round((completedTasks / totalTasks) * 100),
              timestamp: Date.now(),
            };
          }
        }
      }
    }
  }

  private async *executeTaskStream(
    task: StreamingDAGTask
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const taskStartTime = Date.now();

    try {
      yield {
        type: 'progress',
        taskName: task.name,
        content: `开始执行任务: ${task.name}`,
        progress: 0,
        timestamp: Date.now(),
      };

      const input = this.context.getAll();
      let output: Record<string, any>;

      // 检查是否是流式任务
      if (task.isStreaming && task.executeStream) {
        const generator = task.executeStream(input);
        for await (const chunk of generator) {
          yield {
            type: 'data',
            taskName: task.name,
            content: chunk,
            timestamp: Date.now(),
          };
        }
        // 获取最终结果
        const { value } = await generator.next();
        output = value || {};
      } else {
        // 普通任务执行
        output = await task.execute(input);
      }

      // 存储结果
      const taskName = task.name || '';
      this.context.set(taskName, output);

      for (const [key, value] of Object.entries(output)) {
        this.context.set(key, value);
      }

      // 生成唯一的任务键
      let uniqueKey = taskName;
      let counter = 1;
      while (this.taskResults.has(uniqueKey)) {
        uniqueKey = `${taskName}_${counter}`;
        counter++;
      }

      const result: TaskExecutionResult = {
        taskName: taskName,
        status: 'completed',
        output: output,
        duration: Date.now() - taskStartTime,
        timestamp: Date.now(),
      };

      this.taskResults.set(uniqueKey, result);
      this.context.addExecutionResult(result);

      yield {
        type: 'complete',
        taskName: task.name,
        content: `任务完成: ${task.name}`,
        progress: 100,
        timestamp: Date.now(),
        metadata: { duration: result.duration },
      };
    } catch (error) {
      const taskName = task.name || '';
      let uniqueKey = taskName;
      let counter = 1;
      while (this.taskResults.has(uniqueKey)) {
        uniqueKey = `${taskName}_${counter}`;
        counter++;
      }

      const result: TaskExecutionResult = {
        taskName: taskName,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - taskStartTime,
        timestamp: Date.now(),
      };

      this.taskResults.set(uniqueKey, result);
      this.context.addExecutionResult(result);

      yield {
        type: 'error',
        taskName: task.name,
        content: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }
}

// 🌊 流式策略工作流实现
class StreamingStrategyBasedWorkflow
  extends StrategyBasedWorkflow
  implements StreamingWorkflow
{
  executeStream(input: TaskInput = {}): StreamingWorkflowResult {
    const resultPromise = this.execute(input);

    const stream = this.createDynamicExecutionStream(input);

    return {
      stream,
      getResult: () => resultPromise,
    };
  }

  private async *createDynamicExecutionStream(
    input: TaskInput
  ): AsyncGenerator<StreamChunk, WorkflowResult, unknown> {
    this.startTime = Date.now();
    this.dynamicTasksGenerated = 0;
    this.currentStep = 0;
    this.usedStrategies.clear();

    try {
      Object.entries(input).forEach(([key, value]) => {
        this.context.set(key, value);
      });

      yield {
        type: 'progress',
        taskName: 'workflow',
        content: '动态工作流开始执行',
        progress: 0,
        timestamp: Date.now(),
      };

      // 动态执行循环
      while (this.hasTasksToExecute() && this.shouldContinue()) {
        this.currentStep++;

        yield {
          type: 'progress',
          taskName: 'workflow',
          content: `执行第 ${this.currentStep} 步`,
          progress: Math.min(
            (this.currentStep / (this.config.maxDynamicSteps || 50)) * 100,
            90
          ),
          timestamp: Date.now(),
        };

        // 执行当前批次的任务
        const readyTasks = this.getReadyTasks();
        for (const task of readyTasks) {
          yield* this.executeTaskStreamForStrategy(task as StreamingDAGTask);
        }

        // 评估策略并生成新任务
        await this.evaluateStrategiesAndGenerateTasks();

        if (this.dynamicTasksGenerated > 0) {
          yield {
            type: 'data',
            taskName: 'strategy',
            content: `动态生成了 ${this.dynamicTasksGenerated} 个新任务`,
            timestamp: Date.now(),
          };
        }
      }

      const result: WorkflowResult = {
        success: true,
        data: this.context.getAll(),
        executionTime: Date.now() - this.startTime,
        taskResults: this.taskResults,
        dynamicTasksGenerated: this.dynamicTasksGenerated,
        totalSteps: this.currentStep,
      };

      yield {
        type: 'complete',
        taskName: 'workflow',
        content: '动态工作流执行完成',
        progress: 100,
        timestamp: Date.now(),
      };

      return result;
    } catch (error) {
      yield {
        type: 'error',
        taskName: 'workflow',
        content: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };

      return {
        success: false,
        error: error as Error,
        executionTime: Date.now() - this.startTime,
        taskResults: this.taskResults,
        dynamicTasksGenerated: this.dynamicTasksGenerated,
        totalSteps: this.currentStep,
      };
    }
  }

  private async *executeTaskStreamForStrategy(
    task: StreamingDAGTask
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const taskStartTime = Date.now();

    try {
      yield {
        type: 'progress',
        taskName: task.name,
        content: `开始执行动态任务: ${task.name}`,
        progress: 0,
        timestamp: Date.now(),
      };

      const input = this.context.getAll();
      let output: Record<string, any>;

      // 检查是否是流式任务
      if (task.isStreaming && task.executeStream) {
        const generator = task.executeStream(input);
        for await (const chunk of generator) {
          yield {
            type: 'data',
            taskName: task.name,
            content: chunk,
            timestamp: Date.now(),
          };
        }
        // 获取最终结果
        const { value } = await generator.next();
        output = value || {};
      } else {
        // 普通任务执行
        output = await task.execute(input);
      }

      // 存储结果（与基类相同的逻辑）
      const taskName = task.name || '';
      this.context.set(taskName, output);

      for (const [key, value] of Object.entries(output)) {
        this.context.set(key, value);
      }

      let uniqueKey = taskName;
      let counter = 1;
      while (this.taskResults.has(uniqueKey)) {
        uniqueKey = `${taskName}_${counter}`;
        counter++;
      }

      const result: TaskExecutionResult = {
        taskName: taskName,
        status: 'completed',
        output: output,
        duration: Date.now() - taskStartTime,
        timestamp: Date.now(),
      };

      this.taskResults.set(uniqueKey, result);
      this.context.addExecutionResult(result);

      yield {
        type: 'complete',
        taskName: task.name,
        content: `动态任务完成: ${task.name}`,
        progress: 100,
        timestamp: Date.now(),
        metadata: { duration: result.duration },
      };
    } catch (error) {
      console.warn('动态任务执行失败:', error);

      yield {
        type: 'error',
        taskName: task.name,
        content: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }
}

// 🤖 AI SDK 兼容的静态流式工作流
class AISDKStreamingStaticWorkflow
  extends StaticWorkflow
  implements AISDKStreamingWorkflow
{
  executeStreamAISDK(input: TaskInput = {}): AISDKStreamingWorkflowResult {
    const resultPromise = this.execute(input);

    // 创建组合的流
    const combinedStreams = this.createCombinedAISDKStreams(input);

    return {
      textStream: combinedStreams.textStream,
      fullStream: combinedStreams.fullStream,
      toDataStreamResponse: () => combinedStreams.toDataStreamResponse(),
      toReadableStream: () => combinedStreams.toReadableStream(),
      getResult: () => resultPromise,
    };
  }

  private createCombinedAISDKStreams(input: TaskInput) {
    const textChunks: string[] = [];
    const dataChunks: any[] = [];

    const self = this;

    // 创建异步生成器函数
    const textStreamGenerator = async function* (): AsyncGenerator<
      string,
      void,
      unknown
    > {
      try {
        Object.entries(input).forEach(([key, value]) => {
          self.context.set(key, value);
        });

        const levels = self.computeExecutionLevels();

        for (const level of levels) {
          for (const task of level) {
            const aiTask = task as AISDKStreamingTask;

            if (aiTask.isAISDKStreaming && aiTask.executeStreamAI) {
              const streamResult = await aiTask.executeStreamAI(
                self.context.getAll()
              );

              if (streamResult.textStream) {
                for await (const chunk of streamResult.textStream) {
                  textChunks.push(chunk);
                  yield chunk;
                }
              }
            } else {
              // 普通任务，生成状态文本
              const statusText = `[${task.name}] Task completed\n`;
              textChunks.push(statusText);
              yield statusText;

              // 执行任务
              await self.executeTask(task);
            }
          }
        }
      } catch (error) {
        const errorText = `Error: ${
          error instanceof Error ? error.message : String(error)
        }\n`;
        textChunks.push(errorText);
        yield errorText;
      }
    };

    const fullStreamGenerator = async function* (): AsyncGenerator<
      any,
      void,
      unknown
    > {
      try {
        Object.entries(input).forEach(([key, value]) => {
          self.context.set(key, value);
        });

        yield { type: 'workflow-start', data: { status: 'starting' } };

        const levels = self.computeExecutionLevels();

        for (const level of levels) {
          for (const task of level) {
            const aiTask = task as AISDKStreamingTask;

            yield { type: 'task-start', data: { taskName: task.name } };

            if (aiTask.isAISDKStreaming && aiTask.executeStreamAI) {
              const streamResult = await aiTask.executeStreamAI(
                self.context.getAll()
              );

              if (streamResult.fullStream) {
                for await (const chunk of streamResult.fullStream) {
                  dataChunks.push(chunk);
                  yield { type: 'ai-chunk', data: chunk };
                }
              }
            } else {
              // 执行普通任务
              await self.executeTask(task);
              yield {
                type: 'task-complete',
                data: {
                  taskName: task.name,
                  result: self.context.get(task.name),
                },
              };
            }
          }
        }

        yield {
          type: 'workflow-complete',
          data: {
            status: 'completed',
            finalResult: self.context.getAll(),
          },
        };
      } catch (error) {
        yield {
          type: 'workflow-error',
          data: {
            error: error instanceof Error ? error.message : String(error),
          },
        };
      }
    };

    return {
      get textStream() {
        return textStreamGenerator();
      },
      get fullStream() {
        return fullStreamGenerator();
      },

      toDataStreamResponse(): Response {
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of fullStreamGenerator()) {
                const data = `data: ${JSON.stringify(chunk)}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      },

      toReadableStream(): ReadableStream {
        const encoder = new TextEncoder();

        return new ReadableStream({
          async start(controller) {
            try {
              for await (const textChunk of textStreamGenerator()) {
                controller.enqueue(encoder.encode(textChunk));
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });
      },
    };
  }
}

// 🤖 AI SDK 兼容的策略流式工作流
class AISDKStreamingStrategyWorkflow
  extends StrategyBasedWorkflow
  implements AISDKStreamingWorkflow
{
  executeStreamAISDK(input: TaskInput = {}): AISDKStreamingWorkflowResult {
    const resultPromise = this.execute(input);

    // 创建组合的流（动态版本）
    const combinedStreams = this.createDynamicCombinedAISDKStreams(input);

    return {
      textStream: combinedStreams.textStream,
      fullStream: combinedStreams.fullStream,
      toDataStreamResponse: () => combinedStreams.toDataStreamResponse(),
      toReadableStream: () => combinedStreams.toReadableStream(),
      getResult: () => resultPromise,
    };
  }

  private createDynamicCombinedAISDKStreams(input: TaskInput) {
    const textChunks: string[] = [];
    const dataChunks: any[] = [];

    const self = this;

    const textStreamGenerator = async function* (): AsyncGenerator<
      string,
      void,
      unknown
    > {
      try {
        Object.entries(input).forEach(([key, value]) => {
          self.context.set(key, value);
        });

        self.currentStep = 0;
        self.dynamicTasksGenerated = 0;
        self.usedStrategies.clear();

        while (self.hasTasksToExecute() && self.shouldContinue()) {
          self.currentStep++;

          const readyTasks = self.getReadyTasks();

          for (const task of readyTasks) {
            const aiTask = task as AISDKStreamingTask;

            if (aiTask.isAISDKStreaming && aiTask.executeStreamAI) {
              const streamResult = await aiTask.executeStreamAI(
                self.context.getAll()
              );

              if (streamResult.textStream) {
                for await (const chunk of streamResult.textStream) {
                  textChunks.push(chunk);
                  yield chunk;
                }
              }
            } else {
              const statusText = `[${task.name}] Task completed\n`;
              textChunks.push(statusText);
              yield statusText;

              await self.executeTask(task);
            }
          }

          // 评估动态策略
          await self.evaluateStrategiesAndGenerateTasks();
        }
      } catch (error) {
        const errorText = `Error: ${
          error instanceof Error ? error.message : String(error)
        }\n`;
        textChunks.push(errorText);
        yield errorText;
      }
    };

    const fullStreamGenerator = async function* (): AsyncGenerator<
      any,
      void,
      unknown
    > {
      try {
        Object.entries(input).forEach(([key, value]) => {
          self.context.set(key, value);
        });

        yield { type: 'dynamic-workflow-start', data: { status: 'starting' } };

        self.currentStep = 0;
        self.dynamicTasksGenerated = 0;
        self.usedStrategies.clear();

        while (self.hasTasksToExecute() && self.shouldContinue()) {
          self.currentStep++;

          yield {
            type: 'dynamic-step',
            data: {
              step: self.currentStep,
              maxSteps: self.config.maxDynamicSteps || 50,
            },
          };

          const readyTasks = self.getReadyTasks();

          for (const task of readyTasks) {
            const aiTask = task as AISDKStreamingTask;

            yield { type: 'task-start', data: { taskName: task.name } };

            if (aiTask.isAISDKStreaming && aiTask.executeStreamAI) {
              const streamResult = await aiTask.executeStreamAI(
                self.context.getAll()
              );

              if (streamResult.fullStream) {
                for await (const chunk of streamResult.fullStream) {
                  dataChunks.push(chunk);
                  yield { type: 'ai-chunk', data: chunk };
                }
              }
            } else {
              await self.executeTask(task);
              yield {
                type: 'task-complete',
                data: {
                  taskName: task.name,
                  result: self.context.get(task.name),
                },
              };
            }
          }

          // 评估动态策略
          const beforeCount = self.tasks.length;
          await self.evaluateStrategiesAndGenerateTasks();
          const afterCount = self.tasks.length;

          if (afterCount > beforeCount) {
            yield {
              type: 'dynamic-tasks-generated',
              data: {
                newTasks: afterCount - beforeCount,
                totalGenerated: self.dynamicTasksGenerated,
              },
            };
          }
        }

        yield {
          type: 'dynamic-workflow-complete',
          data: {
            status: 'completed',
            totalSteps: self.currentStep,
            dynamicTasksGenerated: self.dynamicTasksGenerated,
            finalResult: self.context.getAll(),
          },
        };
      } catch (error) {
        yield {
          type: 'dynamic-workflow-error',
          data: {
            error: error instanceof Error ? error.message : String(error),
          },
        };
      }
    };

    return {
      get textStream() {
        return textStreamGenerator();
      },
      get fullStream() {
        return fullStreamGenerator();
      },

      toDataStreamResponse(): Response {
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of fullStreamGenerator()) {
                const data = `data: ${JSON.stringify(chunk)}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      },

      toReadableStream(): ReadableStream {
        const encoder = new TextEncoder();

        return new ReadableStream({
          async start(controller) {
            try {
              for await (const textChunk of textStreamGenerator()) {
                controller.enqueue(encoder.encode(textChunk));
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });
      },
    };
  }
}
