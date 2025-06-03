import { DAGTask } from '../DAG';
import type { TaskInput, TaskOutput } from '../Task';
import type { TaskPlanner } from '../DynamicDAG';
import type { ContextManager } from '../ContextManager';
import { DynamicDAGWorkflowEngine } from '../DynamicDAG';

export class DynamicPlannerTask implements DAGTask {
  name = 'DynamicPlannerTask';
  dependsOn: DAGTask[] = [];
  private planner: TaskPlanner;
  private nextInput: string;

  constructor(planner: TaskPlanner, nextInput: string) {
    this.planner = planner;
    this.nextInput = nextInput;
  }

  async execute(input: TaskInput): Promise<TaskOutput> {
    const context = input.context as ContextManager;

    // 获取当前工作流引擎
    const engine = context.get('workflowEngine') as DynamicDAGWorkflowEngine;
    if (!engine || !(engine instanceof DynamicDAGWorkflowEngine)) {
      throw new Error('Workflow engine not found in context or invalid type');
    }

    // 获取当前已完成的任务
    const completedTasks = context.get('completedTasks') || [];

    // 规划下一阶段任务
    const plan = await this.planner.plan(this.nextInput, context);

    // 将新任务添加到当前工作流，但只依赖于已完成的任务
    for (const task of plan.tasks) {
      // 过滤掉未完成的任务依赖
      const validDependencies = (plan.dependencies.get(task) || []).filter(
        (dep) => completedTasks.includes(dep)
      );

      // 如果所有依赖都已完成，则添加任务
      if (
        validDependencies.length === (plan.dependencies.get(task) || []).length
      ) {
        await engine.addTask(task, validDependencies);
      } else {
        // 如果有未完成的依赖，将任务标记为待处理
        context.set('pendingTasks', [
          ...(context.get('pendingTasks') || []),
          { task, dependencies: plan.dependencies.get(task) || [] },
        ]);
      }
    }

    return {
      ...input,
      planResult: {
        tasksAdded: plan.tasks.length,
        nextInput: this.nextInput,
        pendingTasks: context.get('pendingTasks')?.length || 0,
      },
    };
  }
}
