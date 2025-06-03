import { jest } from '@jest/globals';
import { LLMTaskPlanner } from '../LLMTaskPlanner';
import { ContextManager } from '../ContextManager';
import { DAGTask, DAGWorkflowEngine } from '../DAG';
import { streamText } from 'ai';
import { TaskRegistry } from '../TaskRegistry';
import { registerBaseTasks } from '../tasks/BaseTasks';
import { TaskExecutor } from '../TaskExecutor';
import { DynamicDAGWorkflowEngine } from '../DynamicDAG';
import type { TaskInput } from '../Task';
import { DynamicPlannerTask } from '../tasks/DynamicPlannerTask';

// Set global timeout
jest.setTimeout(30000);

// Create mock implementation
const mockStreamText = jest.fn().mockImplementation(() => ({
  text: Promise.resolve(
    JSON.stringify({
      tasks: [
        {
          name: 'CoderTask',
          description: 'Generate code for the request',
          dependencies: [],
        },
        {
          name: 'FileTask',
          description: 'Read the generated code',
          dependencies: ['CoderTask'],
        },
        {
          name: 'CasualTask',
          description: 'Provide a summary',
          dependencies: ['FileTask'],
        },
      ],
    })
  ),
  toDataStreamResponse: () => ({
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('0:"Hello"\n'));
        controller.close();
      },
    }),
  }),
}));

// Mock the AI SDK
jest.mock('ai', () => ({
  streamText: mockStreamText,
}));

describe('LLMTaskPlanner', () => {
  let planner: LLMTaskPlanner;
  let context: ContextManager;
  let registry: TaskRegistry;
  let executor: TaskExecutor;
  let engine: DAGWorkflowEngine;

  beforeEach(() => {
    registry = TaskRegistry.getInstance();
    registry.clear();
    registerBaseTasks();
    planner = new LLMTaskPlanner();
    context = new ContextManager();
    executor = new TaskExecutor(context);
    engine = new DAGWorkflowEngine(executor);
    // Reset mock before each test
    mockStreamText.mockClear();
  });

  it('should create and execute a valid task plan with registered tasks', async () => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout')), 25000);
    });

    const testPromise = (async () => {
      // 1. 规划任务
      const plan = await planner.plan(
        'Write a Python script and explain it',
        context
      );

      // 2. 验证任务规划
      expect(plan.tasks).toHaveLength(3);
      const taskNames = plan.tasks.map((t) => t.name);
      expect(taskNames).toContain('CoderTask');
      expect(taskNames).toContain('FileTask');
      expect(taskNames).toContain('CasualTask');

      // 3. 验证依赖关系
      const coderTask = plan.tasks.find(
        (t) => t.name === 'CoderTask'
      ) as DAGTask;
      const fileTask = plan.tasks.find((t) => t.name === 'FileTask') as DAGTask;
      const casualTask = plan.tasks.find(
        (t) => t.name === 'CasualTask'
      ) as DAGTask;

      expect(plan.dependencies.get(coderTask)).toHaveLength(0);
      expect(plan.dependencies.get(fileTask)).toContain(coderTask);
      expect(plan.dependencies.get(casualTask)).toContain(fileTask);

      // 4. 执行工作流
      const dag = {
        tasks: plan.tasks,
      };

      // 设置任务依赖
      for (const [task, deps] of plan.dependencies.entries()) {
        task.dependsOn = deps;
      }

      // 监听任务状态变化
      const statusChanges: Array<{ task: DAGTask; status: string }> = [];
      engine.on('taskStatusChanged', (task, status) => {
        statusChanges.push({ task, status });
      });

      // 执行工作流
      await engine.run(dag);

      // 5. 验证执行结果
      // 验证任务执行顺序
      expect(statusChanges).toHaveLength(6); // 3个任务，每个任务有running和completed两个状态
      expect(statusChanges[0].task.name).toBe('CoderTask');
      expect(statusChanges[2].task.name).toBe('FileTask');
      expect(statusChanges[4].task.name).toBe('CasualTask');

      // 验证任务输出
      expect(context.get('code')).toBe('Generated code will be here');
      expect(context.get('fileOperation')).toBe('File operation result');
      expect(context.get('response')).toBe('Conversational response');
    })();

    await Promise.race([testPromise, timeoutPromise]);
  });

  it('should throw error for unknown tasks', async () => {
    mockStreamText.mockImplementation(() => ({
      text: Promise.resolve(
        JSON.stringify({
          tasks: [
            {
              name: 'UnknownTask',
              description: 'This task does not exist',
              dependencies: [],
            },
          ],
        })
      ),
      toDataStreamResponse: () => ({
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('0:"Unknown task"\n'));
            controller.close();
          },
        }),
      }),
    }));

    await expect(planner.plan('Invalid request', context)).rejects.toThrow(
      'Unknown task: UnknownTask'
    );
  });

  it('should handle empty task list', async () => {
    mockStreamText.mockImplementation(() => ({
      text: Promise.resolve(JSON.stringify({ tasks: [] })),
      toDataStreamResponse: () => ({
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('0:"Empty tasks"\n'));
            controller.close();
          },
        }),
      }),
    }));

    const plan = await planner.plan('Empty request', context);
    expect(plan.tasks).toHaveLength(0);
    expect(plan.dependencies.size).toBe(0);
  });

  it('should handle invalid JSON response', async () => {
    mockStreamText.mockImplementation(() => ({
      text: Promise.resolve('invalid json'),
      toDataStreamResponse: () => ({
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('0:"Invalid JSON"\n'));
            controller.close();
          },
        }),
      }),
    }));

    await expect(planner.plan('Invalid request', context)).rejects.toThrow();
  });

  it('should handle missing dependencies', async () => {
    mockStreamText.mockImplementation(() => ({
      text: Promise.resolve(
        JSON.stringify({
          tasks: [
            {
              name: 'CoderTask',
              description: 'First task',
              dependencies: ['NonExistentTask'],
            },
          ],
        })
      ),
      toDataStreamResponse: () => ({
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('0:"Missing dependency"\n')
            );
            controller.close();
          },
        }),
      }),
    }));

    const plan = await planner.plan('Missing dependency request', context);
    expect(plan.tasks).toHaveLength(1);
    expect(plan.dependencies.get(plan.tasks[0])).toHaveLength(0);
  });

  it('should support dynamic task addition and removal', async () => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout')), 25000);
    });

    const testPromise = (async () => {
      // 1. 初始规划
      const plan = await planner.plan('Write a Python script', context);
      const dynamicEngine = new DynamicDAGWorkflowEngine(executor, planner);

      // 2. 执行初始工作流
      await dynamicEngine.planAndRun('Write a Python script');

      // 3. 验证初始任务执行
      expect(context.get('code')).toBe('Generated code will be here');

      // 4. 添加新任务
      class NewTask implements DAGTask {
        name = 'NewTask';
        async execute(input: TaskInput) {
          return { ...input, newResult: 'New task executed' };
        }
      }

      const newTask = new NewTask();
      const currentTasks = dynamicEngine.getCurrentPlan()?.tasks || [];
      const lastTask = currentTasks[currentTasks.length - 1];

      // 添加新任务，依赖于最后一个任务
      await dynamicEngine.addTask(newTask, [lastTask]);

      // 5. 验证新任务执行
      expect(context.get('newResult')).toBe('New task executed');

      // 6. 移除任务
      await dynamicEngine.removeTask(newTask);

      // 7. 验证任务被移除
      const updatedPlan = dynamicEngine.getCurrentPlan();
      expect(updatedPlan?.tasks).not.toContain(newTask);
    })();

    await Promise.race([testPromise, timeoutPromise]);
  });

  it('should support dynamic task planning during execution', async () => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout')), 25000);
    });

    const testPromise = (async () => {
      // 1. 设置初始工作流
      const dynamicEngine = new DynamicDAGWorkflowEngine(executor, planner);

      // 2. 将 workflowEngine 添加到 context
      context.set('workflowEngine', dynamicEngine);
      context.set('completedTasks', []);

      // 3. 先执行初始规划
      await dynamicEngine.planAndRun('Initial analysis');

      // 4. 创建动态规划任务
      const dynamicTask = new DynamicPlannerTask(
        planner,
        'Continue with analysis'
      );

      // 5. 执行任务
      const result = await dynamicTask.execute({ context });

      // 6. 验证任务执行结果
      expect(result.planResult).toBeDefined();
      expect(result.planResult.tasksAdded).toBeGreaterThan(0);
      expect(result.planResult.nextInput).toBe('Continue with analysis');
      expect(result.planResult.pendingTasks).toBeDefined();
    })();

    await Promise.race([testPromise, timeoutPromise]);
  });
});
