import { LLMTaskPlanner } from '../LLMTaskPlanner';
import { ContextManager } from '../ContextManager';
import { DynamicDAGWorkflowEngine } from '../DynamicDAG';
import { TaskExecutor } from '../TaskExecutor';

async function main() {
  // 创建任务规划器
  const planner = new LLMTaskPlanner('gpt-4-turbo');
  const context = new ContextManager();
  const executor = new TaskExecutor(context);
  const engine = new DynamicDAGWorkflowEngine(executor, planner);

  // 用户请求
  const userRequest = '分析这个代码库并生成一个总结报告';

  try {
    // 直接运行计划和执行
    await engine.planAndRun(userRequest);
    // 可选：获取执行结果或上下文
    console.log('Workflow executed. Context:', context.getAll());
  } catch (error) {
    console.error('Error:', error);
  }
}

// 运行示例
main().catch(console.error);
