#!/usr/bin/env tsx

import { WorkflowBuilder } from '../src/workflow/WorkflowBuilder';
import type { DAGTask } from '../src/workflow/WorkflowBuilder';
import type { TaskInput } from '../src/workflow/Task';

/**
 * 🛡️ 错误处理示例
 *
 * 本示例展示：
 * 1. 任务失败处理
 * 2. 错误恢复策略
 * 3. 超时处理
 * 4. 回退机制
 * 5. 错误监控和日志
 */

// 🔥 可能失败的网络请求任务
class NetworkRequestTask implements DAGTask {
  name = 'networkRequest';

  constructor(private failureRate: number = 0.3) {}

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🌐 正在发起网络请求...');

    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 模拟随机失败
    if (Math.random() < this.failureRate) {
      throw new Error('网络请求失败: 连接超时');
    }

    const networkData = {
      status: 'success',
      data: { users: 150, activeConnections: 45 },
      timestamp: Date.now(),
    };

    console.log('✅ 网络请求成功');
    return { ...input, networkData };
  }
}

// ⏰ 超时任务
class SlowProcessingTask implements DAGTask {
  name = 'slowProcessing';

  constructor(private duration: number = 2000) {}

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('⏳ 正在执行耗时处理...');

    // 模拟长时间处理
    await new Promise((resolve) => setTimeout(resolve, this.duration));

    console.log('✅ 耗时处理完成');
    return {
      ...input,
      processedData: {
        result: 'complex_calculation_result',
        processingTime: this.duration,
      },
    };
  }
}

// 💾 数据库操作任务
class DatabaseOperationTask implements DAGTask {
  name = 'databaseOperation';

  constructor(private shouldFail: boolean = false) {}

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('💾 正在执行数据库操作...');

    await new Promise((resolve) => setTimeout(resolve, 400));

    if (this.shouldFail) {
      throw new Error('数据库连接失败: 无法连接到主数据库');
    }

    console.log('✅ 数据库操作成功');
    return {
      ...input,
      dbResult: {
        recordsUpdated: 25,
        operation: 'batch_update',
      },
    };
  }
}

// 🔄 重试任务
class RetryableTask implements DAGTask {
  name = 'retryableTask';
  private attemptCount = 0;

  constructor(private maxAttempts: number = 3) {}

  async execute(input: TaskInput): Promise<Record<string, any>> {
    this.attemptCount++;
    console.log(`🔄 重试任务执行 (第${this.attemptCount}次尝试)`);

    await new Promise((resolve) => setTimeout(resolve, 300));

    // 前两次尝试失败，第三次成功
    if (this.attemptCount < this.maxAttempts) {
      throw new Error(`第${this.attemptCount}次尝试失败`);
    }

    console.log('✅ 重试任务最终成功');
    return {
      ...input,
      retryResult: {
        attempts: this.attemptCount,
        finalResult: 'success_after_retry',
      },
    };
  }
}

// 🚨 紧急备用任务
class FallbackTask implements DAGTask {
  name = 'fallbackTask';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🚨 执行备用方案...');

    await new Promise((resolve) => setTimeout(resolve, 200));

    const fallbackData = {
      source: 'fallback',
      data: { message: '使用缓存数据或默认值' },
      reliability: 'medium',
    };

    console.log('✅ 备用方案执行完成');
    return { ...input, fallbackData };
  }
}

// 🔧 错误恢复任务
class ErrorRecoveryTask implements DAGTask {
  name = 'errorRecovery';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🔧 正在执行错误恢复...');

    await new Promise((resolve) => setTimeout(resolve, 500));

    const recoveryActions = [
      '清理临时文件',
      '重置连接池',
      '发送错误报告',
      '切换到备用服务器',
    ];

    console.log('✅ 错误恢复完成');
    return {
      ...input,
      recoveryResult: {
        actions: recoveryActions,
        status: 'recovered',
        timestamp: Date.now(),
      },
    };
  }
}

// 📊 健康检查任务
class HealthCheckTask implements DAGTask {
  name = 'healthCheck';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('📊 正在执行系统健康检查...');

    await new Promise((resolve) => setTimeout(resolve, 300));

    const healthStatus = {
      system: 'healthy',
      services: {
        database: 'online',
        cache: 'online',
        external_api: 'degraded',
      },
      metrics: {
        cpu: '45%',
        memory: '62%',
        disk: '78%',
      },
    };

    console.log('✅ 健康检查完成');
    return { ...input, healthStatus };
  }
}

// 📝 错误日志任务
class ErrorLoggingTask implements DAGTask {
  name = 'errorLogging';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('📝 正在记录错误日志...');

    const errorLog = {
      timestamp: new Date().toISOString(),
      errorCount: 1,
      errorTypes: ['NetworkError'],
      severity: 'medium',
      actionsTaken: ['fallback_executed', 'error_recovery_initiated'],
    };

    console.log('✅ 错误日志记录完成');
    return { ...input, errorLog };
  }
}

// 🎯 主函数 - 运行错误处理示例
async function runErrorHandlingExample() {
  console.log('🛡️ 开始运行错误处理示例\n');

  try {
    // 示例1: 基础错误处理和恢复
    console.log('🎯 示例1: 基础错误处理和恢复');
    console.log('='.repeat(50));

    const basicWorkflow = WorkflowBuilder.create()
      .addTask(new NetworkRequestTask(0.8)) // 80% 失败率
      .addTask(new DatabaseOperationTask(false))

      // 网络请求失败时启用备用方案
      .addDynamicStrategy({
        name: 'network_fallback',
        condition: (context) => {
          const lastError = context.get('lastError');
          return !!(
            lastError &&
            typeof lastError === 'string' &&
            lastError.includes('网络请求失败')
          );
        },
        generator: async (context) => {
          console.log('🚨 检测到网络失败，启动备用方案');
          return [new FallbackTask()];
        },
        priority: 10,
        once: true,
      })

      // 任何失败时执行错误恢复
      .addDynamicStrategy({
        name: 'error_recovery',
        condition: (context) => context.get('hasError') === true,
        generator: async (context) => {
          console.log('🔧 检测到系统错误，启动恢复流程');
          return [new ErrorRecoveryTask(), new ErrorLoggingTask()];
        },
        priority: 5,
      })

      .withConfig({
        retryAttempts: 2,
        timeoutMs: 5000,
      })
      .build();

    const result1 = await basicWorkflow.execute();

    console.log(`\n✅ 基础错误处理结果: ${result1.success ? '成功' : '失败'}`);
    console.log(`🎯 动态生成任务: ${result1.dynamicTasksGenerated || 0}个`);
    console.log(`⏱️  执行时间: ${result1.executionTime}ms`);

    if (!result1.success) {
      console.log(`❌ 主要错误: ${result1.error?.message}`);
    }

    // 示例2: 超时处理
    console.log('\n🎯 示例2: 超时处理');
    console.log('='.repeat(50));

    const timeoutWorkflow = WorkflowBuilder.create()
      .addTask(new SlowProcessingTask(6000)) // 6秒任务
      .withConfig({
        timeoutMs: 3000, // 3秒超时
      })
      .build();

    const result2 = await timeoutWorkflow.execute();

    console.log(
      `\n⏰ 超时处理结果: ${result2.success ? '成功' : '失败（预期）'}`
    );
    if (!result2.success) {
      console.log(`❌ 超时错误: ${result2.error?.message}`);
    }

    // 示例3: 重试机制
    console.log('\n🎯 示例3: 重试机制演示');
    console.log('='.repeat(50));

    const retryWorkflow = WorkflowBuilder.create()
      .addTask(new RetryableTask(3))
      .addTask(new HealthCheckTask())
      .withConfig({
        retryAttempts: 3,
      })
      .build();

    const result3 = await retryWorkflow.execute();

    console.log(`\n🔄 重试机制结果: ${result3.success ? '成功' : '失败'}`);
    console.log(`⏱️  执行时间: ${result3.executionTime}ms`);

    // 示例4: 复合错误处理策略
    console.log('\n🎯 示例4: 复合错误处理策略');
    console.log('='.repeat(50));

    const comprehensiveWorkflow = WorkflowBuilder.create()
      .addTask(new NetworkRequestTask(0.7)) // 可能失败
      .addTask(new DatabaseOperationTask(false))
      .addTask(new SlowProcessingTask(1000))

      // 多层错误处理策略
      .addDynamicStrategy({
        name: 'immediate_fallback',
        condition: (context) => {
          // 检查是否有关键任务失败
          const networkData = context.get('networkData');
          return !networkData;
        },
        generator: async (context) => {
          console.log('🚨 关键任务失败，立即启动备用流程');
          return [new FallbackTask(), new HealthCheckTask()];
        },
        priority: 10,
      })

      .addDynamicStrategy({
        name: 'system_recovery',
        condition: (context) => !!context.get('fallbackData'),
        generator: async (context) => {
          console.log('🔧 备用流程已启动，执行系统恢复');
          return [new ErrorRecoveryTask()];
        },
        priority: 8,
      })

      .addDynamicStrategy({
        name: 'post_recovery_check',
        condition: (context) => !!context.get('recoveryResult'),
        generator: async (context) => {
          console.log('📊 恢复完成，执行系统检查');
          return [new HealthCheckTask(), new ErrorLoggingTask()];
        },
        priority: 5,
      })

      .withConfig({
        retryAttempts: 2,
        timeoutMs: 8000,
        maxDynamicSteps: 10,
      })
      .build();

    const result4 = await comprehensiveWorkflow.execute();

    console.log(`\n🛡️ 综合错误处理结果: ${result4.success ? '成功' : '失败'}`);
    console.log(`🎯 动态生成任务: ${result4.dynamicTasksGenerated || 0}个`);
    console.log(`📈 总执行步数: ${result4.totalSteps || 0}`);
    console.log(`🔧 最终任务总数: ${result4.taskResults.size}`);
    console.log(`⏱️  总执行时间: ${result4.executionTime}ms`);

    // 详细结果分析
    console.log('\n📊 详细执行分析:');
    result4.taskResults.forEach((taskResult, taskName) => {
      const status = taskResult.status === 'completed' ? '✅' : '❌';
      const type = taskName.includes('fallback')
        ? '🚨'
        : taskName.includes('recovery')
        ? '🔧'
        : taskName.includes('health')
        ? '📊'
        : '⚙️';
      console.log(
        `${type} ${status} ${taskName}: ${taskResult.status} (${taskResult.duration}ms)`
      );
    });

    // 错误统计
    const failedTasks = Array.from(result4.taskResults.values()).filter(
      (r) => r.status === 'failed'
    );
    const completedTasks = Array.from(result4.taskResults.values()).filter(
      (r) => r.status === 'completed'
    );

    console.log('\n📈 执行统计:');
    console.log(`✅ 成功任务: ${completedTasks.length}个`);
    console.log(`❌ 失败任务: ${failedTasks.length}个`);
    console.log(
      `📊 成功率: ${(
        (completedTasks.length / result4.taskResults.size) *
        100
      ).toFixed(1)}%`
    );

    if (result4.success) {
      console.log('\n🎉 系统展现出良好的容错能力和恢复机制！');
    } else {
      console.log('\n⚠️ 系统遇到了无法恢复的错误，但错误处理机制正常工作');
    }
  } catch (error) {
    console.error('💥 错误处理示例执行异常:', error);
  }
}

// 🚀 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  runErrorHandlingExample().catch(console.error);
}

export { runErrorHandlingExample };
