import { ContextManager } from '../ContextManager';
import { TaskExecutor } from '../TaskExecutor';
import { WorkflowEngine } from '../Workflow';
import { workflowDefinition } from './tasks';

async function main() {
  const context = new ContextManager();
  const executor = new TaskExecutor(context);
  const engine = new WorkflowEngine(executor);

  // 设置初始上下文
  context.set('rawData', "   What's the weather today?   ");

  // 运行工作流
  await engine.run(workflowDefinition);

  // 查看最终上下文
  console.log('Final Context:', context.getAll());

  // 设置初始上下文
  context.set('rawData', '   How about the stock market today?   ');

  // 运行工作流
  await engine.run(workflowDefinition);

  // 查看最终上下文
  console.log('Final Context:', context.getAll());
}

main();
