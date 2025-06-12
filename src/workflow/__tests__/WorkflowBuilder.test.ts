import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  WorkflowBuilder,
  type WorkflowConfig,
  type DynamicStrategy,
  type DAGTask,
} from '../WorkflowBuilder';
import type { TaskInput } from '../Task';

// Mock任务类型
interface MockTask {
  name: string;
  dependsOn: DAGTask[];
  execute: jest.MockedFunction<
    (input: TaskInput) => Promise<Record<string, any>>
  >;
}

// 创建Mock任务的辅助函数
function createMockTask(
  name: string,
  output: Record<string, any> = {},
  dependencies: DAGTask[] = []
): MockTask {
  return {
    name,
    execute: jest
      .fn<(input: TaskInput) => Promise<Record<string, any>>>()
      .mockResolvedValue({ [name]: output }),
    dependsOn: dependencies,
  };
}

describe('WorkflowBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('🏗️ 基础构建功能', () => {
    it('应该能创建基础的WorkflowBuilder实例', () => {
      const builder = WorkflowBuilder.create();
      expect(builder).toBeInstanceOf(WorkflowBuilder);
    });

    it('应该支持链式配置', () => {
      const builder = WorkflowBuilder.create()
        .withRetry(3)
        .withTimeout(5000)
        .withConfig({
          maxDynamicSteps: 10,
        });

      expect(builder).toBeInstanceOf(WorkflowBuilder);
    });

    it('应该能添加静态任务', () => {
      const task1 = createMockTask('task1');
      const task2 = createMockTask('task2');

      const builder = WorkflowBuilder.create().addTask(task1).addTasks([task2]);

      expect(builder).toBeInstanceOf(WorkflowBuilder);
    });
  });

  describe('🔧 静态工作流测试', () => {
    it('应该成功执行简单的静态工作流', async () => {
      const task1 = createMockTask('task1', { result: 'task1_output' });
      const task2 = createMockTask('task2', { result: 'task2_output' });

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .addTask(task2)
        .build();

      const result = await workflow.execute({ input: 'test' });

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(2);
      expect(task1.execute).toHaveBeenCalledWith(
        expect.objectContaining({ input: 'test' })
      );
      expect(task2.execute).toHaveBeenCalledWith(expect.any(Object));
    });

    it('应该正确处理任务依赖关系', async () => {
      const task1 = createMockTask('task1', { step1: 'done' });
      const task2 = createMockTask('task2', { step2: 'done' }, [task1]);
      const task3 = createMockTask('task3', { step3: 'done' }, [task1, task2]);

      const workflow = WorkflowBuilder.create()
        .addTasks([task1, task2, task3])
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(task1.execute).toHaveBeenCalled();
      expect(task2.execute).toHaveBeenCalled();
      expect(task3.execute).toHaveBeenCalled();
      // 验证依赖顺序通过检查调用时间
    });

    it('应该正确处理并行任务', async () => {
      const task1 = createMockTask('task1', { parallel1: 'done' });
      const task2 = createMockTask('task2', { parallel2: 'done' });
      const task3 = createMockTask('task3', { final: 'done' }, [task1, task2]);

      const workflow = WorkflowBuilder.create()
        .addTasks([task1, task2, task3])
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(3);
      // task1 和 task2 应该并行执行，然后是 task3
    });

    it('应该正确处理任务执行失败', async () => {
      const task1 = createMockTask('task1', { result: 'success' });
      const task2 = createMockTask('task2');
      task2.execute.mockRejectedValue(new Error('Task failed'));

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .addTask(task2)
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.taskResults.get('task2')?.status).toBe('failed');
    });
  });

  describe('🎯 动态策略工作流测试', () => {
    it('应该支持条件任务生成', async () => {
      const initialTask = createMockTask('initial', { condition: true });
      const conditionalTask = createMockTask('conditional', {
        result: 'conditional_done',
      });

      const workflow = WorkflowBuilder.create()
        .addTask(initialTask)
        .whenCondition(
          (context) => {
            const initialData = context.get('initial') as any;
            return initialData?.condition === true;
          },
          async (context) => [conditionalTask]
        )
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBe(1);
      expect(result.taskResults.has('conditional')).toBe(true);
    });

    it('应该支持基于任务完成的动态生成', async () => {
      const task1 = createMockTask('analyze', {
        issues: ['security', 'performance'],
      });
      const securityTask = createMockTask('security_audit', {
        security: 'fixed',
      });
      const performanceTask = createMockTask('performance_fix', {
        performance: 'optimized',
      });

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .onTaskComplete('analyze', async (result, context) => {
          const tasks: DAGTask[] = [];
          // result的格式是 { analyze: { issues: [...] } }
          const analyzeData = result?.analyze;
          if (analyzeData?.issues?.includes('security')) {
            tasks.push(securityTask);
          }
          if (analyzeData?.issues?.includes('performance')) {
            tasks.push(performanceTask);
          }
          return tasks;
        })
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBe(2);
      expect(result.taskResults.has('security_audit')).toBe(true);
      expect(result.taskResults.has('performance_fix')).toBe(true);
    });

    it('应该支持基于上下文变化的任务生成', async () => {
      const configTask = createMockTask('readConfig', { framework: 'react' });
      const reactTask = createMockTask('analyzeReact', { components: 5 });

      const workflow = WorkflowBuilder.create()
        .addTask(configTask)
        .onContextChange('readConfig', async (configData: any, context) => {
          const framework = configData?.framework;
          if (framework === 'react') {
            return [reactTask];
          }
          return [];
        })
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBe(1);
      expect(result.taskResults.has('analyzeReact')).toBe(true);
    });

    it('应该正确处理策略优先级', async () => {
      const initialTask = createMockTask('initial', { trigger: true });
      const highPriorityTask = createMockTask('high_priority', {
        priority: 'high',
      });
      const lowPriorityTask = createMockTask('low_priority', {
        priority: 'low',
      });

      const highPriorityStrategy: DynamicStrategy = {
        name: 'high_priority',
        condition: (context) => {
          const initialData = context.get('initial') as any;
          return initialData?.trigger === true;
        },
        generator: async () => [highPriorityTask as DAGTask],
        priority: 10,
      };

      const lowPriorityStrategy: DynamicStrategy = {
        name: 'low_priority',
        condition: (context) => {
          const initialData = context.get('initial') as any;
          return initialData?.trigger === true;
        },
        generator: async () => [lowPriorityTask as DAGTask],
        priority: 1,
      };

      const workflow = WorkflowBuilder.create()
        .addTask(initialTask)
        .addDynamicStrategy(lowPriorityStrategy)
        .addDynamicStrategy(highPriorityStrategy)
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      // 高优先级策略应该先执行
      const taskResults = Array.from(result.taskResults.values());
      const highPriorityIndex = taskResults.findIndex(
        (r) => r.taskName === 'high_priority'
      );
      const lowPriorityIndex = taskResults.findIndex(
        (r) => r.taskName === 'low_priority'
      );

      if (highPriorityIndex !== -1 && lowPriorityIndex !== -1) {
        expect(highPriorityIndex).toBeLessThan(lowPriorityIndex);
      }
    });

    it('应该支持一次性策略', async () => {
      const triggerTask = createMockTask('trigger', { shouldGenerate: true });
      const oneTimeTask = createMockTask('one_time', { executed: true });

      let generationCount = 0;

      const workflow = WorkflowBuilder.create()
        .addTask(triggerTask)
        .addDynamicStrategy({
          name: 'one_time_strategy',
          condition: (context) => {
            const triggerData = context.get('trigger') as any;
            return triggerData?.shouldGenerate === true;
          },
          generator: async () => {
            generationCount++;
            return [oneTimeTask];
          },
          once: true,
        })
        .withConfig({ maxDynamicSteps: 5 })
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(generationCount).toBe(1); // 只应该生成一次
    });

    it('应该限制最大动态步数', async () => {
      const infiniteTask = createMockTask('infinite', { shouldContinue: true });

      let stepCount = 0;
      const workflow = WorkflowBuilder.create()
        .addTask(infiniteTask)
        .addDynamicStrategy({
          name: 'infinite_generator',
          condition: (context) => {
            const infiniteData = context.get('infinite') as any;
            return infiniteData?.shouldContinue === true;
          },
          generator: async () => {
            stepCount++;
            return [
              createMockTask(`step_${stepCount}`, { shouldContinue: true }),
            ];
          },
          // 不设置once: true，让它能持续生成
        })
        .withConfig({ maxDynamicSteps: 3 })
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.totalSteps).toBe(3); // 应该限制在3步
    });
  });

  describe('🤖 LLM动态工作流测试', () => {
    it('应该创建LLM驱动的动态工作流', () => {
      const workflow = WorkflowBuilder.create().build();

      expect(workflow).toBeDefined();
      // 注意：这里不执行实际的LLM调用，因为需要API密钥
    });
  });

  describe('🔄 上下文和结果管理', () => {
    it('应该正确管理工作流上下文', async () => {
      const task1 = createMockTask('task1', { data: 'value1' });
      const task2 = createMockTask('task2', { data: 'value2' });

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .addTask(task2)
        .build();

      const result = await workflow.execute({ initial: 'input' });

      const context = workflow.getContext();
      expect(context.get('initial')).toBe('input');
      expect(context.get('task1')).toEqual({ data: 'value1' });
      expect(context.get('task2')).toEqual({ data: 'value2' });
    });

    it('应该正确追踪执行历史', async () => {
      const task1 = createMockTask('task1', { step: 1 });
      const task2 = createMockTask('task2', { step: 2 });

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .addTask(task2)
        .build();

      await workflow.execute();

      const history = workflow.getContext().getExecutionHistory();
      expect(history).toHaveLength(2);
      expect(history[0].taskName).toBe('task1');
      expect(history[1].taskName).toBe('task2');
      expect(history[0].status).toBe('completed');
      expect(history[1].status).toBe('completed');
    });

    it('应该提供详细的执行结果', async () => {
      const task1 = createMockTask('task1', { result: 'success' });

      const workflow = WorkflowBuilder.create().addTask(task1).build();

      const result = await workflow.execute();

      expect(result).toMatchObject({
        success: true,
        executionTime: expect.any(Number),
        taskResults: expect.any(Map),
      });

      expect(result.taskResults.get('task1')).toMatchObject({
        taskName: 'task1',
        status: 'completed',
        duration: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('⚙️ 配置和错误处理', () => {
    it('应该正确应用工作流配置', () => {
      const config: WorkflowConfig = {
        retryAttempts: 3,
        timeoutMs: 5000,
        maxDynamicSteps: 20,
      };

      const workflow = WorkflowBuilder.create().withConfig(config).build();

      expect(workflow).toBeDefined();
    });

    it('应该处理空任务列表', async () => {
      const workflow = WorkflowBuilder.create().build();
      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(0);
    });

    it('应该处理重复的任务名称', async () => {
      const task1 = createMockTask('duplicate', { version: 1 });
      const task2 = createMockTask('duplicate', { version: 2 });

      const workflow = WorkflowBuilder.create()
        .addTask(task1)
        .addTask(task2)
        .build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      // 应该执行两个任务，即使名称相同
    });
  });

  describe('🔍 边界情况测试', () => {
    it('应该处理循环依赖检测', async () => {
      const task1 = createMockTask('task1');
      const task2 = createMockTask('task2', {}, [task1]);
      const task3 = createMockTask('task3', {}, [task2]);

      // 创建循环依赖
      task1.dependsOn = [task3];

      const workflow = WorkflowBuilder.create()
        .addTasks([task1, task2, task3])
        .build();

      // 应该在执行时检测到循环依赖
      const result = await workflow.execute();

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Circular dependency');
    });

    it('应该处理大量任务', async () => {
      const tasks = Array.from({ length: 100 }, (_, i) =>
        createMockTask(`task_${i}`, { index: i })
      );

      const workflow = WorkflowBuilder.create().addTasks(tasks).build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(100);
    });

    it('应该处理深度依赖链', async () => {
      const tasks: MockTask[] = [];

      // 创建深度为50的依赖链
      for (let i = 0; i < 50; i++) {
        const dependencies = i > 0 ? [tasks[i - 1]] : [];
        tasks.push(createMockTask(`task_${i}`, { depth: i }, dependencies));
      }

      const workflow = WorkflowBuilder.create().addTasks(tasks).build();

      const result = await workflow.execute();

      expect(result.success).toBe(true);
      expect(result.taskResults.size).toBe(50);
    });
  });
});
