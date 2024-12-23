import { ContextManager } from '../ContextManager';
import { DAG, DAGParser, DAGWorkflowEngine } from '../DAG';
import { TaskExecutor } from '../TaskExecutor';
import { TaskRegistry } from '../TaskRegistry';

describe('条件分支DAG任务调度', () => {
  let registry: TaskRegistry;
  let context: ContextManager;
  let executor: TaskExecutor;
  let engine: DAGWorkflowEngine;
  let executionOrder: string[];

  beforeEach(() => {
    registry = new TaskRegistry();
    context = new ContextManager();
    executor = new TaskExecutor(context);
    engine = new DAGWorkflowEngine(registry, executor);
    executionOrder = [];
  });

  test('条件分支执行 - 当条件为真时应该执行TaskB', async () => {
    const dag: DAG = {
      tasks: [
        {
          name: 'TaskA',
          async execute() {
            executionOrder.push('TaskA');
            return { value: 10 };
          },
        },
        {
          name: 'ConditionalTask',
          dependsOn: ['TaskA'],
          branches: [
            {
              condition: (ctx: ContextManager) => ctx.get('value') > 5,
              next: 'TaskB',
            },
            {
              condition: (ctx: ContextManager) => ctx.get('value') <= 5,
              next: 'TaskC',
            },
          ],
          async execute() {
            executionOrder.push('ConditionalTask');
            return {};
          },
        },
        {
          name: 'TaskB',
          dependsOn: ['ConditionalTask'],
          async execute() {
            executionOrder.push('TaskB');
            return {};
          },
        },
        {
          name: 'TaskC',
          dependsOn: ['ConditionalTask'],
          async execute() {
            executionOrder.push('TaskC');
            return {};
          },
        },
      ],
    };

    // 注册任务
    dag.tasks.forEach((task) => registry.register(task));

    // 运行工作流
    await engine.run(dag);

    // 验证执行顺序
    expect(executionOrder).toEqual(['TaskA', 'ConditionalTask', 'TaskB']);
    // 验证TaskC没有被执行
    expect(executionOrder).not.toContain('TaskC');
  });

  test('条件分支执行 - 当条件为假时应该执行TaskC', async () => {
    const dag: DAG = {
      tasks: [
        {
          name: 'TaskA',
          async execute() {
            executionOrder.push('TaskA');
            return { value: 3 };
          },
        },
        {
          name: 'ConditionalTask',
          dependsOn: ['TaskA'],
          branches: [
            {
              condition: (ctx: ContextManager) => ctx.get('value') > 5,
              next: 'TaskB',
            },
            {
              condition: (ctx: ContextManager) => ctx.get('value') <= 5,
              next: 'TaskC',
            },
          ],
          async execute() {
            executionOrder.push('ConditionalTask');
            return {};
          },
        },
        {
          name: 'TaskB',
          dependsOn: ['ConditionalTask'],
          async execute() {
            executionOrder.push('TaskB');
            return {};
          },
        },
        {
          name: 'TaskC',
          dependsOn: ['ConditionalTask'],
          async execute() {
            executionOrder.push('TaskC');
            return {};
          },
        },
      ],
    };

    // 注册任务
    dag.tasks.forEach((task) => registry.register(task));

    // 运行工作流
    await engine.run(dag);

    // 验证执行顺序
    expect(executionOrder).toEqual(['TaskA', 'ConditionalTask', 'TaskC']);
    // 验证TaskB没有被执行
    expect(executionOrder).not.toContain('TaskB');
  });

  test('条件分支执行 - 使用默认分支', async () => {
    const dag: DAG = {
      tasks: [
        {
          name: 'TaskA',
          async execute() {
            executionOrder.push('TaskA');
            return { value: 5 };
          },
        },
        {
          name: 'ConditionalTask',
          dependsOn: ['TaskA'],
          branches: [
            {
              condition: (ctx: ContextManager) => ctx.get('value') > 10,
              next: 'TaskB',
            },
          ],
          defaultNext: 'TaskC',
          async execute() {
            executionOrder.push('ConditionalTask');
            return {};
          },
        },
        {
          name: 'TaskB',
          dependsOn: ['ConditionalTask'],
          async execute() {
            executionOrder.push('TaskB');
            return {};
          },
        },
        {
          name: 'TaskC',
          dependsOn: ['ConditionalTask'],
          async execute() {
            executionOrder.push('TaskC');
            return {};
          },
        },
      ],
    };

    // 注册任务
    dag.tasks.forEach((task) => registry.register(task));

    // 运行工作流
    await engine.run(dag);

    // 验证执行顺序
    expect(executionOrder).toEqual(['TaskA', 'ConditionalTask', 'TaskC']);
    // 验证TaskB没有被执行
    expect(executionOrder).not.toContain('TaskB');
  });

  test('条件分支的层级结构应该正确', () => {
    const dag: DAG = {
      tasks: [
        { name: 'TaskA', async execute() { return {}; } },
        {
          name: 'ConditionalTask',
          dependsOn: ['TaskA'],
          branches: [
            { condition: () => true, next: 'TaskB' },
            { condition: () => false, next: 'TaskC' },
          ],
          async execute() { return {}; },
        },
        { name: 'TaskB', dependsOn: ['ConditionalTask'], async execute() { return {}; } },
        { name: 'TaskC', dependsOn: ['ConditionalTask'], async execute() { return {}; } },
      ],
    };

    const levels = DAGParser.getExecutionOrderWithLevels(dag);
    
    expect(levels.length).toBe(3);
    expect(levels[0].tasks).toEqual(['TaskA']);
    expect(levels[1].tasks).toEqual(['ConditionalTask']);
    expect(levels[2].tasks).toContain('TaskB');
    expect(levels[2].tasks).toContain('TaskC');
  });
});
