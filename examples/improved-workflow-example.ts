#!/usr/bin/env tsx

import { WorkflowBuilder, DAGTask } from '../src/workflow/WorkflowBuilder';
import type { TaskInput } from '../src/workflow/Task';

/**
 * 🚀 改进的工作流示例 - 展示新的抽象类用法
 *
 * 本示例展示：
 * 1. 使用 DAGTask 抽象类（而非接口）
 * 2. 依赖关系自动管理（不会遗忘）
 * 3. 只能通过 WorkflowBuilder.create() 创建工作流
 */

// 📝 改进的任务定义 - 继承抽象类
class ImprovedDataFetchTask extends DAGTask {
  name = 'improvedDataFetch';

  // ✅ 构造函数自动调用 super()，依赖关系始终存在
  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🔄 改进版：正在获取数据...');
    console.log(`📋 依赖任务数量: ${this.dependsOn.length}`); // 绝对不会是 undefined

    // 模拟数据获取
    await new Promise((resolve) => setTimeout(resolve, 300));

    const data = {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' },
      ],
      timestamp: new Date().toISOString(),
    };

    console.log('✅ 改进版：数据获取完成');
    return { ...input, fetchedData: data };
  }
}

// 🔍 改进的验证任务
class ImprovedValidationTask extends DAGTask {
  name = 'improvedValidation';

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies); // ✅ 必须调用 super()
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🔍 改进版：正在验证数据...');
    console.log(`📋 依赖任务: ${this.dependsOn.map((d) => d.name).join(', ')}`);

    const { fetchedData } = input;
    if (!fetchedData?.users) {
      throw new Error('缺少必要的用户数据');
    }

    const validationResult = {
      isValid: true,
      checkedCount: fetchedData.users.length,
      validatedAt: new Date().toISOString(),
    };

    console.log('✅ 改进版：数据验证完成');
    return { ...input, validationResult };
  }
}

// 📊 改进的分析任务
class ImprovedAnalysisTask extends DAGTask {
  name = 'improvedAnalysis';

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('📊 改进版：正在分析数据...');
    console.log(
      `📋 当前任务依赖于: ${this.dependsOn.map((d) => d.name).join(', ')}`
    );

    const { fetchedData, validationResult } = input;

    const analysis = {
      totalUsers: fetchedData.users.length,
      adminCount: fetchedData.users.filter((u: any) => u.role === 'admin')
        .length,
      userCount: fetchedData.users.filter((u: any) => u.role === 'user').length,
      dataQuality: validationResult.isValid ? 'excellent' : 'needs_improvement',
      analyzedAt: new Date().toISOString(),
    };

    console.log('✅ 改进版：数据分析完成');
    return { ...input, analysisResult: analysis };
  }
}

// 🎯 运行改进的工作流
async function runImprovedWorkflow() {
  console.log('🚀 开始运行改进的工作流示例\n');

  try {
    // ❌ 这样会报错 - 构造函数是私有的
    // const builder = new WorkflowBuilder(); // TypeScript 错误！

    // ✅ 正确的方式 - 只能通过工厂方法创建
    const fetchTask = new ImprovedDataFetchTask(); // 无依赖，传空数组或不传
    const validationTask = new ImprovedValidationTask([fetchTask]); // 依赖 fetchTask
    const analysisTask = new ImprovedAnalysisTask([validationTask]); // 依赖 validationTask

    // 🔒 验证依赖关系自动设置
    console.log('📋 任务依赖关系验证:');
    console.log(`  ${fetchTask.name}: ${fetchTask.dependsOn.length} 个依赖`);
    console.log(
      `  ${validationTask.name}: ${validationTask.dependsOn.length} 个依赖`
    );
    console.log(
      `  ${analysisTask.name}: ${analysisTask.dependsOn.length} 个依赖\n`
    );

    // 🏭 使用工厂方法创建工作流
    const workflow = WorkflowBuilder.create()
      .addTasks([fetchTask, validationTask, analysisTask])
      .withConfig({
        retryAttempts: 2,
        timeoutMs: 5000,
      })
      .build();

    // 执行工作流
    const startTime = Date.now();
    const result = await workflow.execute({
      projectId: 'improved-workflow-demo',
      environment: 'development',
    });

    const executionTime = Date.now() - startTime;

    // 显示结果
    console.log('\n🎉 改进的工作流执行完成！');
    console.log('='.repeat(60));
    console.log(`✅ 执行状态: ${result.success ? '成功' : '失败'}`);
    console.log(`⏱️  总执行时间: ${result.executionTime}ms`);
    console.log(`📊 实际执行时间: ${executionTime}ms`);
    console.log(`🔢 执行任务数: ${result.taskResults.size}`);

    if (result.success) {
      const analysis = result.data?.analysisResult;
      console.log('\n📈 分析结果概览:');
      console.log(`  👥 总用户数: ${analysis?.totalUsers}`);
      console.log(`  👑 管理员数: ${analysis?.adminCount}`);
      console.log(`  🧑‍💻 普通用户数: ${analysis?.userCount}`);
      console.log(`  🎯 数据质量: ${analysis?.dataQuality}`);
    } else {
      console.error('❌ 执行失败:', result.error?.message);
    }

    // 显示执行顺序验证
    console.log('\n📈 任务执行顺序验证:');
    const history = Array.from(result.taskResults.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );

    history.forEach(([taskName, taskResult], index) => {
      const status = taskResult.status === 'completed' ? '✅' : '❌';
      console.log(
        `  ${index + 1}. ${status} ${taskName} (${taskResult.duration}ms)`
      );
    });
  } catch (error) {
    console.error('💥 改进的工作流执行异常:', error);
  }
}

// 🧪 类型安全验证函数
function demonstrateTypeSafety() {
  console.log('\n🔒 类型安全特性演示:');

  const task1 = new ImprovedDataFetchTask();
  const task2 = new ImprovedValidationTask([task1]);

  // ✅ dependsOn 始终是数组，不会是 undefined
  console.log(`  Task1 依赖数量: ${task1.dependsOn.length}`); // 绝对安全
  console.log(`  Task2 依赖数量: ${task2.dependsOn.length}`); // 绝对安全
  console.log(`  Task2 第一个依赖: ${task2.dependsOn[0]?.name}`); // 类型安全

  // ❌ 这些操作现在是不可能的：
  // task1.dependsOn = undefined; // 编译错误！
  // task2.dependsOn.push(undefined); // 编译错误！
}

// 🚀 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateTypeSafety();
  runImprovedWorkflow().catch(console.error);
}

export { runImprovedWorkflow, demonstrateTypeSafety };
