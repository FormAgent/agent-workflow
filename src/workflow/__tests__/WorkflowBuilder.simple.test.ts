import { describe, it, expect, beforeEach } from '@jest/globals';
import { WorkflowBuilder, type DAGTask } from '../WorkflowBuilder';
import type { TaskInput } from '../Task';

// 简单的测试任务实现
class SimpleTask implements DAGTask {
  constructor(
    public name: string,
    private outputData: Record<string, any> = {},
    public dependsOn?: DAGTask[]
  ) {}

  async execute(input: TaskInput): Promise<Record<string, any>> {
    // 简单的模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 1));
    return { [this.name]: this.outputData, timestamp: Date.now() };
  }
}

// 失败任务
class FailingTask extends SimpleTask {
  async execute(input: TaskInput): Promise<Record<string, any>> {
    throw new Error(`任务 ${this.name} 执行失败`);
  }
}

describe('WorkflowBuilder 功能测试', () => {
  describe('🏗️ 基础构建', () => {
    it('应该能创建WorkflowBuilder实例', () => {
      const builder = WorkflowBuilder.create();
      expect(builder).toBeDefined();
    });

    it('应该支持链式配置', () => {
      const builder = WorkflowBuilder.create()
        .withLLMModel('gpt-4')
        .withRetry(3)
        .withTimeout(5000);

      expect(builder).toBeDefined();
    });

    it('应该能构建基础工作流', () => {
      const task = new SimpleTask('test', { result: 'success' });
      const workflow = WorkflowBuilder.create().addTask(task).build();

      expect(workflow).toBeDefined();
    });
  });

  describe('🔧 静态工作流执行', () => {
    it('应该成功执行单个任务', async () => {
      const task = new SimpleTask('singleTask', { value: 42 });

      const workflow = WorkflowBuilder.create().addTask(task).build();

      const result = await workflow.execute({ input: 'test' });

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(1);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该执行多个独立任务', async () => {
      const task1 = new SimpleTask('task1', { step: 1 });
      const task2 = new SimpleTask('task2', { step: 2 });
      const task3 = new SimpleTask('task3', { step: 3 });

      const workflow = WorkflowBuilder.create()
        .addTasks([task1, task2, task3])
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(3);

      // 检查所有任务都完成了
      expect(result.taskResults.get('task1')?.status).toBe('completed');
      expect(result.taskResults.get('task2')?.status).toBe('completed');
      expect(result.taskResults.get('task3')?.status).toBe('completed');
    });

    it('应该处理任务依赖关系', async () => {
      const task1 = new SimpleTask('first', { order: 1 });
      const task2 = new SimpleTask('second', { order: 2 }, [task1]);
      const task3 = new SimpleTask('third', { order: 3 }, [task1, task2]);

      const workflow = WorkflowBuilder.create()
        .addTasks([task3, task1, task2]) // 故意乱序添加
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(3);

      // 验证执行顺序
      const history = workflow.getContext().getExecutionHistory();
      const timestamps = history.map((h) => h.timestamp);

      const firstTime =
        history.find((h) => h.taskName === 'first')?.timestamp || 0;
      const secondTime =
        history.find((h) => h.taskName === 'second')?.timestamp || 0;
      const thirdTime =
        history.find((h) => h.taskName === 'third')?.timestamp || 0;

      expect(firstTime).toBeLessThanOrEqual(secondTime);
      expect(secondTime).toBeLessThanOrEqual(thirdTime);
    });

    it('应该处理任务失败', async () => {
      const successTask = new SimpleTask('success', { result: 'ok' });
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
    it('应该支持条件任务生成', async () => {
      const triggerTask = new SimpleTask('trigger', { needsAnalysis: true });
      const conditionalTask = new SimpleTask('conditional', {
        analysis: 'done',
      });

      const workflow = WorkflowBuilder.create()
        .addTask(triggerTask)
        .whenCondition(
          (context) => {
            const triggerData = context.get('trigger') as any;
            return triggerData?.needsAnalysis === true;
          },
          async () => [conditionalTask]
        )
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBe(1);
      expect(result.taskResults.has('conditional')).toBe(true);
    });

    it('应该支持基于任务完成的动态生成', async () => {
      const analyzeTask = new SimpleTask('analyze', {
        issues: ['security', 'performance'],
        quality: 0.6,
      });

      const workflow = WorkflowBuilder.create()
        .addTask(analyzeTask)
        .onTaskComplete('analyze', async (result, context) => {
          const tasks: DAGTask[] = [];
          // result的格式是 { analyze: { issues: [...], quality: 0.6 }, timestamp: ... }
          const analyzeData = result?.analyze;
          const issues = analyzeData?.issues || [];

          if (issues.includes('security')) {
            tasks.push(new SimpleTask('securityFix', { fixed: true }));
          }
          if (issues.includes('performance')) {
            tasks.push(new SimpleTask('performanceFix', { optimized: true }));
          }

          return tasks;
        })
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBe(2);
      expect(result.taskResults.has('securityFix')).toBe(true);
      expect(result.taskResults.has('performanceFix')).toBe(true);
    });

    it('应该支持基于上下文变化的任务生成', async () => {
      const configTask = new SimpleTask('config', {
        framework: 'react',
        version: '18.0',
      });

      const workflow = WorkflowBuilder.create()
        .addTask(configTask)
        .onContextChange('config', async (configData: any, context) => {
          const framework = configData?.framework;
          switch (framework) {
            case 'react':
              return [new SimpleTask('reactAnalysis', { components: 10 })];
            case 'vue':
              return [new SimpleTask('vueAnalysis', { components: 5 })];
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

    it('应该限制最大动态步数', async () => {
      const triggerTask = new SimpleTask('trigger', { shouldContinue: true });

      const workflow = WorkflowBuilder.create()
        .addTask(triggerTask)
        .whenCondition(
          (context) => context.get('shouldContinue') === true,
          async () => [
            new SimpleTask(`step_${Date.now()}`, { shouldContinue: true }),
          ]
        )
        .withConfig({ maxDynamicSteps: 3 })
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.totalSteps).toBeLessThanOrEqual(3);
    });

    it('条件不满足时不应该生成任务', async () => {
      const task = new SimpleTask('trigger', { flag: false });

      const workflow = WorkflowBuilder.create()
        .addTask(task)
        .whenCondition(
          (context) => context.get('flag') === true,
          async () => [new SimpleTask('shouldNotRun', { executed: true })]
        )
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBe(0);
      expect(result.taskResults.has('shouldNotRun')).toBe(false);
    });
  });

  describe('📊 上下文和结果管理', () => {
    it('应该正确管理工作流上下文', async () => {
      const task1 = new SimpleTask('producer', {
        data: 'important_value',
        count: 42,
      });
      const task2 = new SimpleTask('consumer', { processed: true });

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .addTask(task2)
        .build();

      const result = await workflow.execute({ initial: 'start' });

      const context = workflow.getContext();
      expect(context.get('initial')).toBe('start');

      const producerData = context.get('producer');
      expect(producerData).toMatchObject({
        data: 'important_value',
        count: 42,
      });
    });

    it('应该追踪执行历史', async () => {
      const task1 = new SimpleTask('step1', { phase: 'init' });
      const task2 = new SimpleTask('step2', { phase: 'process' });
      const task3 = new SimpleTask('step3', { phase: 'complete' });

      const workflow = WorkflowBuilder.create()
        .addTasks([task1, task2, task3])
        .build();

      await workflow.execute();

      const history = workflow.getContext().getExecutionHistory();
      expect(history).toHaveLength(3);

      // 验证每个历史记录的结构
      history.forEach((record, index) => {
        expect(record).toMatchObject({
          taskName: `step${index + 1}`,
          status: 'completed',
          duration: expect.any(Number),
          timestamp: expect.any(Number),
        });
        expect(record.duration).toBeGreaterThan(0);
      });
    });

    it('应该提供详细的执行结果', async () => {
      const task = new SimpleTask('detailedTask', { metric: 100 });

      const workflow = WorkflowBuilder.create().addTask(task).build();

      const result = await workflow.execute();

      expect(result).toMatchObject({
        success: true,
        executionTime: expect.any(Number),
        taskResults: expect.any(Map),
      });

      expect(result.executionTime).toBeGreaterThanOrEqual(0);

      const taskResult = result.taskResults.get('detailedTask');
      expect(taskResult).toMatchObject({
        taskName: 'detailedTask',
        status: 'completed',
        duration: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('⚙️ 配置测试', () => {
    it('应该正确处理配置选项', async () => {
      const task = new SimpleTask('configuredTask', { result: 'success' });

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

    it('应该处理空工作流', async () => {
      const workflow = WorkflowBuilder.create().build();
      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(0);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('🔍 性能测试', () => {
    it('应该高效处理并行任务', async () => {
      const tasks = Array.from(
        { length: 20 },
        (_, i) => new SimpleTask(`parallel_${i}`, { index: i })
      );

      const workflow = WorkflowBuilder.create().addTasks(tasks).build();

      const startTime = Date.now();
      const result = await workflow.execute();
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(20);
      // 并行执行应该比串行快得多
      expect(duration).toBeLessThan(500);
    });

    it('应该处理依赖链', async () => {
      const tasks: SimpleTask[] = [];

      // 创建长度为10的依赖链
      for (let i = 0; i < 10; i++) {
        const deps = i > 0 ? [tasks[i - 1]] : undefined;
        tasks.push(new SimpleTask(`chain_${i}`, { depth: i }, deps));
      }

      const workflow = WorkflowBuilder.create().addTasks(tasks).build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(10);

      // 验证执行顺序
      const history = workflow.getContext().getExecutionHistory();
      for (let i = 1; i < 10; i++) {
        const prevTime =
          history.find((h) => h.taskName === `chain_${i - 1}`)?.timestamp || 0;
        const currTime =
          history.find((h) => h.taskName === `chain_${i}`)?.timestamp || 0;
        expect(prevTime).toBeLessThanOrEqual(currTime);
      }
    });
  });
});
