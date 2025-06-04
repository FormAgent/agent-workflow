#!/usr/bin/env tsx

import { WorkflowBuilder } from '../src/workflow/WorkflowBuilder';
import type { DAGTask } from '../src/workflow/WorkflowBuilder';
import type { TaskInput } from '../src/workflow/Task';

/**
 * 🎯 动态策略示例
 *
 * 本示例展示WorkflowBuilder的四种动态策略：
 * 1. 条件策略 - whenCondition()
 * 2. 任务完成策略 - onTaskComplete()
 * 3. 上下文变化策略 - onContextChange()
 * 4. 自定义策略 - addDynamicStrategy()
 */

// 🔍 项目扫描任务
class ProjectScanTask implements DAGTask {
  name = 'projectScan';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🔍 正在扫描项目结构...');

    const projectPath = input.projectPath || './';

    // 模拟项目扫描
    await new Promise((resolve) => setTimeout(resolve, 800));

    const scanResult = {
      totalFiles: 156,
      fileTypes: ['typescript', 'javascript', 'json', 'markdown'],
      framework: 'react',
      hasTests: true,
      packageManager: 'npm',
      dependencies: 45,
      devDependencies: 23,
      linesOfCode: 12500,
      complexity: 0.75, // 代码复杂度评分 0-1
    };

    console.log('✅ 项目扫描完成:', scanResult);
    return { ...input, scanResult };
  }
}

// 🔧 TypeScript检查任务
class TypeScriptCheckTask implements DAGTask {
  name = 'typeScriptCheck';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🔧 正在进行TypeScript类型检查...');

    await new Promise((resolve) => setTimeout(resolve, 600));

    const typeCheckResult = {
      errors: 0,
      warnings: 3,
      typeCoverage: 0.92,
      strictMode: true,
    };

    console.log('✅ TypeScript检查完成:', typeCheckResult);
    return { ...input, typeCheckResult };
  }
}

// 🧪 测试任务
class TestRunnerTask implements DAGTask {
  name = 'testRunner';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🧪 正在运行测试...');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const testResult = {
      totalTests: 85,
      passed: 82,
      failed: 3,
      coverage: 0.78,
      duration: 45.6,
    };

    console.log('✅ 测试运行完成:', testResult);
    return { ...input, testResult };
  }
}

// 🔒 安全审计任务
class SecurityAuditTask implements DAGTask {
  name = 'securityAudit';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🔒 正在进行安全审计...');

    await new Promise((resolve) => setTimeout(resolve, 700));

    const securityResult = {
      vulnerabilities: {
        critical: 0,
        high: 1,
        medium: 3,
        low: 7,
      },
      outdatedPackages: 5,
      recommendedActions: [
        '更新lodash到最新版本',
        '检查XSS防护措施',
        '更新开发依赖',
      ],
    };

    console.log('✅ 安全审计完成:', securityResult);
    return { ...input, securityResult };
  }
}

// 🚀 性能优化任务
class PerformanceOptimizationTask implements DAGTask {
  name = 'performanceOptimization';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🚀 正在进行性能优化分析...');

    await new Promise((resolve) => setTimeout(resolve, 900));

    const performanceResult = {
      bundleSize: '256KB',
      loadTime: 2.3,
      suggestions: ['启用代码分割', '优化图片资源', '使用懒加载'],
      score: 85,
    };

    console.log('✅ 性能优化分析完成:', performanceResult);
    return { ...input, performanceResult };
  }
}

// 📊 代码质量分析任务
class CodeQualityTask implements DAGTask {
  name = 'codeQuality';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('📊 正在分析代码质量...');

    await new Promise((resolve) => setTimeout(resolve, 500));

    const qualityResult = {
      maintainabilityIndex: 0.82,
      codeSmells: 12,
      technicalDebt: '2.5h',
      duplicatedLines: 156,
      complexity: input.scanResult?.complexity || 0.75,
    };

    console.log('✅ 代码质量分析完成:', qualityResult);
    return { ...input, qualityResult };
  }
}

// 🔧 重构建议任务
class RefactorSuggestionTask implements DAGTask {
  name = 'refactorSuggestion';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🔧 正在生成重构建议...');

    await new Promise((resolve) => setTimeout(resolve, 400));

    const refactorSuggestions = [
      '提取重复的工具函数',
      '简化复杂的条件逻辑',
      '使用更合适的设计模式',
      '优化函数参数结构',
    ];

    console.log('✅ 重构建议生成完成');
    return { ...input, refactorSuggestions };
  }
}

// 📝 测试生成任务
class TestGenerationTask implements DAGTask {
  name = 'testGeneration';

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('📝 正在生成测试用例...');

    await new Promise((resolve) => setTimeout(resolve, 600));

    const generatedTests = {
      unitTests: 15,
      integrationTests: 8,
      e2eTests: 3,
      estimatedCoverageIncrease: 0.15,
    };

    console.log('✅ 测试用例生成完成:', generatedTests);
    return { ...input, generatedTests };
  }
}

// 🎯 主函数 - 运行动态策略示例
async function runDynamicStrategiesExample() {
  console.log('🎯 开始运行动态策略示例\n');

  try {
    const projectScanTask = new ProjectScanTask();

    // 🔥 使用WorkflowBuilder的动态策略
    const workflow = WorkflowBuilder.create()
      .addTask(projectScanTask)

      // 策略1: 条件策略 - 如果是TypeScript项目，运行类型检查
      .whenCondition(
        (context) => {
          const scanResult = context.get('scanResult') as any;
          return scanResult?.fileTypes?.includes('typescript');
        },
        async (context) => {
          console.log('🎯 检测到TypeScript项目，添加类型检查任务');
          return [new TypeScriptCheckTask()];
        }
      )

      // 策略2: 条件策略 - 如果有测试，运行测试
      .whenCondition(
        (context) => {
          const scanResult = context.get('scanResult') as any;
          return scanResult?.hasTests === true;
        },
        async (context) => {
          console.log('🎯 检测到测试文件，添加测试运行任务');
          return [new TestRunnerTask()];
        }
      )

      // 策略3: 上下文变化策略 - 根据框架类型添加特定任务
      .onContextChange('scanResult', async (scanData: any, context) => {
        const tasks: DAGTask[] = [];

        if (scanData?.framework === 'react') {
          console.log('🎯 检测到React项目，添加React特定检查');
          tasks.push(new SecurityAuditTask());
        }

        if (scanData?.dependencies > 40) {
          console.log('🎯 检测到大量依赖，添加性能优化分析');
          tasks.push(new PerformanceOptimizationTask());
        }

        return tasks;
      })

      // 策略4: 任务完成策略 - 基于扫描结果决定后续任务
      .onTaskComplete('projectScan', async (result, context) => {
        const tasks: DAGTask[] = [];
        const scanResult = result?.scanResult;

        // 总是添加代码质量分析
        tasks.push(new CodeQualityTask());

        console.log('🎯 基于扫描结果，添加代码质量分析任务');
        return tasks;
      })

      // 策略5: 自定义策略 - 高复杂度代码重构建议
      .addDynamicStrategy({
        name: 'complexity_analysis',
        condition: (context) => {
          const qualityResult = context.get('codeQuality') as any;
          return qualityResult?.complexity > 0.7;
        },
        generator: async (context) => {
          console.log('🎯 检测到高复杂度代码，添加重构建议任务');
          return [new RefactorSuggestionTask()];
        },
        priority: 5,
      })

      // 策略6: 自定义策略 - 测试覆盖率不足时生成测试
      .addDynamicStrategy({
        name: 'test_coverage_enhancement',
        condition: (context) => {
          const testResult = context.get('testResult') as any;
          return testResult?.coverage < 0.8;
        },
        generator: async (context) => {
          console.log('🎯 测试覆盖率不足，添加测试生成任务');
          return [new TestGenerationTask()];
        },
        priority: 3,
        once: true, // 只生成一次
      })

      .withConfig({
        maxDynamicSteps: 10,
      })
      .build();

    // 执行工作流
    const startTime = Date.now();
    const result = await workflow.execute({
      projectPath: './src',
      analysisType: 'comprehensive',
    });

    const executionTime = Date.now() - startTime;

    // 显示结果
    console.log('\n🎉 动态策略工作流执行完成！');
    console.log('='.repeat(60));
    console.log(`✅ 执行状态: ${result.success ? '成功' : '失败'}`);
    console.log(`⏱️  总执行时间: ${result.executionTime}ms`);
    console.log(`📊 实际执行时间: ${executionTime}ms`);
    console.log(`🔢 静态任务数: 1`);
    console.log(`🎯 动态生成任务数: ${result.dynamicTasksGenerated || 0}`);
    console.log(`📈 总执行步数: ${result.totalSteps || 0}`);
    console.log(`🔧 最终任务总数: ${result.taskResults.size}`);

    if (result.success) {
      console.log('\n📋 分析结果摘要:');

      // 扫描结果
      const scanResult = result.data?.scanResult;
      if (scanResult) {
        console.log(`📁 文件总数: ${scanResult.totalFiles}`);
        console.log(`🏗️  框架: ${scanResult.framework}`);
        console.log(`📦 依赖数量: ${scanResult.dependencies}`);
        console.log(
          `💯 代码复杂度: ${(scanResult.complexity * 100).toFixed(1)}%`
        );
      }

      // 测试结果
      const testResult = result.data?.testResult;
      if (testResult) {
        console.log(
          `🧪 测试通过率: ${(
            (testResult.passed / testResult.totalTests) *
            100
          ).toFixed(1)}%`
        );
        console.log(
          `📊 测试覆盖率: ${(testResult.coverage * 100).toFixed(1)}%`
        );
      }

      // 安全结果
      const securityResult = result.data?.securityResult;
      if (securityResult) {
        const totalVulns = Object.values(securityResult.vulnerabilities).reduce(
          (a: any, b: any) => a + b,
          0
        );
        console.log(`🔒 安全漏洞总数: ${totalVulns}`);
      }
    } else {
      console.error('❌ 执行失败:', result.error?.message);
    }

    // 显示动态策略触发情况
    console.log('\n🎯 动态策略执行详情:');
    result.taskResults.forEach((taskResult, taskName) => {
      const status = taskResult.status === 'completed' ? '✅' : '❌';
      const isDynamic = taskName !== 'projectScan' ? '🎯' : '📋';
      console.log(
        `${isDynamic} ${status} ${taskName}: ${taskResult.status} (${taskResult.duration}ms)`
      );
    });
  } catch (error) {
    console.error('💥 动态策略工作流执行异常:', error);
  }
}

// 🚀 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  runDynamicStrategiesExample().catch(console.error);
}

export { runDynamicStrategiesExample };
