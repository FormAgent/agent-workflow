import { describe, it, expect, beforeEach } from '@jest/globals';
import { WorkflowBuilder, type DAGTask } from '../WorkflowBuilder';
import { TaskRegistry } from '../TaskRegistry';
import type { TaskInput } from '../Task';

// 实际任务实现
class TestTask implements DAGTask {
  constructor(
    public name: string,
    private outputData: Record<string, any> = {},
    public dependsOn?: DAGTask[]
  ) {}

  async execute(input: TaskInput): Promise<Record<string, any>> {
    // 模拟异步处理
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { ...input, ...this.outputData };
  }
}

// 失败任务
class FailingTask extends TestTask {
  async execute(input: TaskInput): Promise<Record<string, any>> {
    throw new Error(`Task ${this.name} failed`);
  }
}

describe('WorkflowBuilder 集成测试', () => {
  let registry: TaskRegistry;

  beforeEach(() => {
    registry = TaskRegistry.getInstance();
    // 清空注册表
    (registry as any).tasks = new Map();

    // 注册一些测试任务
    registry.registerTask({
      name: 'testTask',
      description: 'Test task for integration testing',
      capabilities: ['testing'],
      createTask: () => new TestTask('testTask', { result: 'test_completed' }),
    });

    registry.registerTask({
      name: 'analyzeCode',
      description: 'Analyze code and find issues',
      capabilities: ['analysis'],
      createTask: () =>
        new TestTask('analyzeCode', {
          issues: ['security', 'performance'],
          codeQuality: 0.8,
        }),
    });

    registry.registerTask({
      name: 'securityAudit',
      description: 'Perform security audit',
      capabilities: ['security'],
      createTask: () =>
        new TestTask('securityAudit', {
          vulnerabilities: 2,
          fixed: true,
        }),
    });

    registry.registerTask({
      name: 'performanceOptimization',
      description: 'Optimize performance',
      capabilities: ['performance'],
      createTask: () =>
        new TestTask('performanceOptimization', {
          optimizations: 5,
          improved: true,
        }),
    });
  });

  describe('🚀 基础工作流执行', () => {
    it('应该成功执行简单的静态工作流', async () => {
      const task1 = new TestTask('task1', { step: 1 });
      const task2 = new TestTask('task2', { step: 2 });

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .addTask(task2)
        .build();

      const result = await workflow.execute({ initialData: 'test' });

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(2);
      expect(result.data?.task1).toEqual({ step: 1, initialData: 'test' });
      expect(result.data?.task2).toEqual({
        step: 2,
        initialData: 'test',
        task1: { step: 1, initialData: 'test' },
      });
    });

    it('应该正确处理任务依赖', async () => {
      const task1 = new TestTask('task1', { step: 1 });
      const task2 = new TestTask('task2', { step: 2 }, [task1]);
      const task3 = new TestTask('task3', { step: 3 }, [task1, task2]);

      const workflow = WorkflowBuilder.create()
        .addTasks([task1, task2, task3])
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(3);

      // 验证执行顺序
      const history = workflow.getContext().getExecutionHistory();
      const task1Index = history.findIndex((h) => h.taskName === 'task1');
      const task2Index = history.findIndex((h) => h.taskName === 'task2');
      const task3Index = history.findIndex((h) => h.taskName === 'task3');

      expect(task1Index).toBeLessThan(task2Index);
      expect(task2Index).toBeLessThan(task3Index);
    });

    it('应该处理任务失败', async () => {
      const successTask = new TestTask('success', { result: 'ok' });
      const failingTask = new FailingTask('failing');

      const workflow = WorkflowBuilder.create()
        .addTask(successTask)
        .addTask(failingTask)
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.taskResults.get('success')?.status).toBe('completed');
      expect(result.taskResults.get('failing')?.status).toBe('failed');
    });
  });

  describe('🎯 动态任务生成', () => {
    it('应该支持条件动态生成', async () => {
      const triggerTask = new TestTask('trigger', { needsAnalysis: true });
      const analysisTask = new TestTask('analysis', { completed: true });

      const workflow = WorkflowBuilder.create()
        .addTask(triggerTask)
        .whenCondition(
          (context) => {
            const triggerData = context.get('trigger') as any;
            return triggerData?.needsAnalysis === true;
          },
          async () => [analysisTask]
        )
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBe(1);
      expect(result.taskResults.has('analysis')).toBe(true);
    });

    it('应该支持基于任务结果的动态生成', async () => {
      const analyzeTask = registry.getTask('analyzeCode')!.createTask();
      const securityTask = registry.getTask('securityAudit')!.createTask();
      const perfTask = registry
        .getTask('performanceOptimization')!
        .createTask();

      const workflow = WorkflowBuilder.create()
        .addTask(analyzeTask)
        .onTaskComplete('analyzeCode', async (result, context) => {
          const tasks: DAGTask[] = [];
          const issues = result?.issues || [];

          if (issues.includes('security')) {
            tasks.push(securityTask);
          }
          if (issues.includes('performance')) {
            tasks.push(perfTask);
          }

          return tasks;
        })
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBe(2);
      expect(result.taskResults.has('securityAudit')).toBe(true);
      expect(result.taskResults.has('performanceOptimization')).toBe(true);
    });

    it('应该支持基于上下文变化的任务生成', async () => {
      const configTask = new TestTask('config', {
        framework: 'react',
        version: '18.0',
      });
      const reactAnalysisTask = new TestTask('reactAnalysis', {
        components: 10,
      });
      const vueAnalysisTask = new TestTask('vueAnalysis', { components: 5 });

      const workflow = WorkflowBuilder.create()
        .addTask(configTask)
        .onContextChange('config', async (configData: any, context) => {
          const framework = configData?.framework;
          switch (framework) {
            case 'react':
              return [reactAnalysisTask];
            case 'vue':
              return [vueAnalysisTask];
            default:
              return [];
          }
        })
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBe(1);
      expect(result.taskResults.has('reactAnalysis')).toBe(true);
      expect(result.taskResults.has('vueAnalysis')).toBe(false);
    });

    it('应该限制动态生成步数', async () => {
      const infiniteTask = new TestTask('infinite', { continue: true });

      const workflow = WorkflowBuilder.create()
        .addTask(infiniteTask)
        .whenCondition(
          (context) => context.get('continue') === true,
          async () => [new TestTask(`step_${Date.now()}`, { continue: true })]
        )
        .withConfig({ maxDynamicSteps: 5 })
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.totalSteps).toBeLessThanOrEqual(5);
    });
  });

  describe('🔧 配置和性能', () => {
    it('应该正确应用配置', async () => {
      const task = new TestTask('configuredTask', { result: 'success' });

      const workflow = WorkflowBuilder.create()
        .withConfig({
          retryAttempts: 3,
          timeoutMs: 5000,
          maxDynamicSteps: 10,
        })
        .addTask(task)
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
    });

    it('应该处理大量并行任务', async () => {
      const tasks = Array.from(
        { length: 50 },
        (_, i) => new TestTask(`parallel_${i}`, { index: i })
      );

      const workflow = WorkflowBuilder.create().addTasks(tasks).build();

      const startTime = Date.now();
      const result = await workflow.execute();
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(50);
      expect(duration).toBeLessThan(1000); // 并行执行应该很快
    });

    it('应该处理深度依赖链', async () => {
      const tasks: TestTask[] = [];

      // 创建深度为20的依赖链
      for (let i = 0; i < 20; i++) {
        const deps = i > 0 ? [tasks[i - 1]] : undefined;
        tasks.push(new TestTask(`chain_${i}`, { depth: i }, deps));
      }

      const workflow = WorkflowBuilder.create().addTasks(tasks).build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(20);

      // 验证执行顺序
      const history = workflow.getContext().getExecutionHistory();
      for (let i = 1; i < 20; i++) {
        const prevIndex = history.findIndex(
          (h) => h.taskName === `chain_${i - 1}`
        );
        const currIndex = history.findIndex((h) => h.taskName === `chain_${i}`);
        expect(prevIndex).toBeLessThan(currIndex);
      }
    });
  });

  describe('📊 上下文和结果管理', () => {
    it('应该正确管理上下文数据', async () => {
      const task1 = new TestTask('producer', {
        data: 'important_value',
        count: 42,
      });
      const task2 = new TestTask('consumer', { processed: true });

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .addTask(task2)
        .build();

      const result = await workflow.execute({ initial: 'start' });

      const context = workflow.getContext();
      expect(context.get('initial')).toBe('start');
      expect(context.get('producer')).toMatchObject({
        data: 'important_value',
        count: 42,
        initial: 'start',
      });
    });

    it('应该提供详细的执行统计', async () => {
      const task1 = new TestTask('stats1', { metric: 100 });
      const task2 = new TestTask('stats2', { metric: 200 });

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .addTask(task2)
        .build();

      const result = await workflow.execute();

      expect(result).toMatchObject({
        success: true,
        executionTime: expect.any(Number),
        taskResults: expect.any(Map),
      });

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.taskResults.size).toBe(2);

      // 检查任务结果详情
      const task1Result = result.taskResults.get('stats1');
      expect(task1Result).toMatchObject({
        taskName: 'stats1',
        status: 'completed',
        duration: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });

    it('应该跟踪完整的执行历史', async () => {
      const tasks = [
        new TestTask('step1', { phase: 'init' }),
        new TestTask('step2', { phase: 'process' }),
        new TestTask('step3', { phase: 'finalize' }),
      ];

      const workflow = WorkflowBuilder.create().addTasks(tasks).build();

      await workflow.execute();

      const history = workflow.getContext().getExecutionHistory();
      expect(history).toHaveLength(3);

      history.forEach((record, index) => {
        expect(record).toMatchObject({
          taskName: `step${index + 1}`,
          status: 'completed',
          duration: expect.any(Number),
          timestamp: expect.any(Number),
        });
      });

      // 验证时间顺序
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp).toBeGreaterThanOrEqual(
          history[i - 1].timestamp
        );
      }
    });
  });

  describe('🔄 边界情况', () => {
    it('应该处理空工作流', async () => {
      const workflow = WorkflowBuilder.create().build();
      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(0);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该处理重复任务名称', async () => {
      const task1 = new TestTask('duplicate', { version: 1 });
      const task2 = new TestTask('duplicate', { version: 2 });

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .addTask(task2)
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(2);
    });

    it('应该处理条件永远不满足的策略', async () => {
      const task = new TestTask('trigger', { flag: false });

      const workflow = WorkflowBuilder.create()
        .addTask(task)
        .whenCondition(
          (context) => context.get('flag') === true,
          async () => [
            new TestTask('never_executed', { result: 'should_not_run' }),
          ]
        )
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBe(0);
      expect(result.taskResults.has('never_executed')).toBe(false);
    });
  });
});
