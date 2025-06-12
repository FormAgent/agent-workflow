#!/usr/bin/env tsx

import { WorkflowBuilder, DAGTask } from '../src/workflow/WorkflowBuilder';
import type { TaskInput } from '../src/workflow/Task';

/**
 * 🤖 LLM集成示例
 *
 * 本示例展示：
 * 1. LLM驱动的动态工作流
 * 2. AI流式响应处理
 * 3. 智能任务规划
 * 4. 基于AI的决策制定
 *
 * 注意：这是模拟示例，实际使用需要配置真实的LLM API
 */

// 🧠 模拟LLM响应生成器
class MockLLMService {
  static async generateResponse(
    prompt: string,
    streaming: boolean = false
  ): Promise<any | AsyncGenerator<string, void, unknown>> {
    // 模拟LLM延迟
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (streaming) {
      return MockLLMService.generateStreamResponse(prompt);
    } else {
      return MockLLMService.generateCompleteResponse(prompt);
    }
  }

  static async *generateStreamResponse(
    prompt: string
  ): AsyncGenerator<string, void, unknown> {
    const responses = [
      '正在分析项目结构...',
      '检测到React TypeScript项目',
      '发现代码质量问题：',
      '- 缺少单元测试覆盖',
      '- 存在代码重复',
      '- 性能优化空间较大',
      '建议执行以下任务：',
      '1. 运行TypeScript类型检查',
      '2. 执行代码质量分析',
      '3. 生成性能报告',
      '4. 创建测试用例',
    ];

    for (const response of responses) {
      yield response;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  private static generateCompleteResponse(prompt: string): any {
    if (prompt.includes('analyze project')) {
      return {
        analysis: {
          projectType: 'React TypeScript Application',
          complexity: 'Medium',
          issues: ['test-coverage', 'code-duplication', 'performance'],
          recommendations: [
            'Add comprehensive unit tests',
            'Refactor duplicated code',
            'Optimize bundle size',
            'Improve code documentation',
          ],
        },
        suggestedTasks: [
          'typecheck',
          'lint',
          'test',
          'security-audit',
          'performance-analysis',
        ],
      };
    }

    if (prompt.includes('code review')) {
      return {
        review: {
          overallScore: 7.5,
          issues: [
            {
              type: 'warning',
              message: '函数复杂度过高',
              file: 'utils.ts',
              line: 45,
            },
            {
              type: 'info',
              message: '建议添加类型注释',
              file: 'components.tsx',
              line: 23,
            },
            {
              type: 'error',
              message: '潜在的内存泄漏',
              file: 'hooks.ts',
              line: 67,
            },
          ],
          suggestions: [
            '使用更具描述性的变量名',
            '提取重复的业务逻辑',
            '添加错误边界处理',
          ],
        },
      };
    }

    return { message: 'AI分析完成', confidence: 0.85 };
  }
}

// 🔍 AI代码分析任务
class AICodeAnalysisTask extends DAGTask {
  name = 'aiCodeAnalysis';

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🧠 正在使用AI分析代码...');

    const projectPath = input.projectPath || './src';
    const prompt = `Please analyze this project: ${projectPath}. Focus on code quality, architecture, and potential improvements.`;

    const aiResponse = await MockLLMService.generateResponse(prompt);

    console.log('✅ AI代码分析完成');
    console.log(
      '🎯 AI建议:',
      aiResponse.analysis?.recommendations?.slice(0, 2)
    );

    return { ...input, aiAnalysis: aiResponse.analysis };
  }
}

// 📝 AI流式文档生成任务
class AIStreamingDocumentationTask extends DAGTask {
  name = 'aiDocumentation';

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('📝 正在使用AI流式生成文档...');

    const prompt = 'Generate comprehensive documentation for this codebase';

    let fullDocumentation = '';
    console.log('🔄 实时文档生成:');

    // 直接使用异步生成器
    const streamGenerator = MockLLMService.generateStreamResponse(prompt);
    for await (const chunk of streamGenerator) {
      fullDocumentation += chunk + '\n';
      console.log(`   ${chunk}`);
    }

    console.log('✅ AI文档生成完成');

    return {
      ...input,
      documentation: {
        content: fullDocumentation,
        wordCount: fullDocumentation.split(' ').length,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

// 🔍 智能代码审查任务
class AICodeReviewTask extends DAGTask {
  name = 'aiCodeReview';

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🔍 正在进行AI代码审查...');

    const prompt =
      'Perform detailed code review focusing on best practices, security, and maintainability';
    const reviewResult = await MockLLMService.generateResponse(prompt);

    console.log('✅ AI代码审查完成');
    console.log(`📊 代码评分: ${reviewResult.review?.overallScore || 8.0}/10`);

    return { ...input, codeReview: reviewResult.review };
  }
}

// 🚀 AI性能优化建议任务
class AIPerformanceOptimizerTask extends DAGTask {
  name = 'aiPerformanceOptimizer';

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🚀 正在生成AI性能优化建议...');

    // 模拟AI分析性能瓶颈
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const optimizations = {
      bundleOptimizations: [
        '启用Tree Shaking',
        '使用动态导入进行代码分割',
        '优化图片资源大小',
      ],
      runtimeOptimizations: [
        '使用React.memo减少重渲染',
        '实现虚拟滚动',
        '优化API请求缓存',
      ],
      estimatedImprovement: {
        bundleSize: '-25%',
        loadTime: '-30%',
        memoryUsage: '-15%',
      },
    };

    console.log('✅ AI性能优化建议生成完成');
    console.log('⚡ 预计性能提升:', optimizations.estimatedImprovement);

    return { ...input, performanceOptimizations: optimizations };
  }
}

// 🧪 AI测试用例生成任务
class AITestGeneratorTask extends DAGTask {
  name = 'aiTestGenerator';

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('🧪 正在使用AI生成测试用例...');

    await new Promise((resolve) => setTimeout(resolve, 700));

    const generatedTests = {
      unitTests: [
        'utils.test.ts - 工具函数测试',
        'components.test.tsx - React组件测试',
        'hooks.test.ts - 自定义Hook测试',
      ],
      integrationTests: [
        'api.integration.test.ts - API集成测试',
        'workflow.integration.test.ts - 工作流集成测试',
      ],
      e2eTests: ['user-journey.e2e.test.ts - 用户流程测试'],
      coverageIncrease: '+23%',
      estimatedTime: '2.5小时',
    };

    console.log('✅ AI测试用例生成完成');
    console.log(`📈 预计覆盖率提升: ${generatedTests.coverageIncrease}`);

    return { ...input, generatedTests };
  }
}

// 📊 AI综合报告生成任务
class AIReportGeneratorTask extends DAGTask {
  name = 'aiReportGenerator';

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log('📊 正在生成AI综合分析报告...');

    const {
      aiAnalysis,
      codeReview,
      performanceOptimizations,
      generatedTests,
      documentation,
    } = input;

    await new Promise((resolve) => setTimeout(resolve, 500));

    const comprehensiveReport = {
      title: 'AI驱动的项目分析报告',
      generatedAt: new Date().toISOString(),
      executiveSummary: {
        overallScore: codeReview?.overallScore || 8.0,
        projectComplexity: aiAnalysis?.complexity || 'Medium',
        keyFindings: [
          '代码质量整体良好，但有改进空间',
          '性能优化潜力较大',
          '测试覆盖率需要提升',
          'AI建议的改进措施具有较高可行性',
        ],
      },
      sections: {
        codeQuality: {
          score: codeReview?.overallScore || 8.0,
          issues: codeReview?.issues?.length || 0,
          suggestions: codeReview?.suggestions?.length || 0,
        },
        performance: {
          optimizations:
            performanceOptimizations?.bundleOptimizations?.length || 0,
          estimatedImprovement: performanceOptimizations?.estimatedImprovement,
        },
        testing: {
          generatedTests: generatedTests?.unitTests?.length || 0,
          coverageIncrease: generatedTests?.coverageIncrease,
        },
        documentation: {
          wordCount: documentation?.wordCount || 0,
          completeness: 'Good',
        },
      },
      recommendations: [
        '优先实施性能优化建议',
        '增加自动化测试覆盖',
        '建立代码质量监控流程',
        '定期进行AI辅助代码审查',
      ],
    };

    console.log('✅ AI综合报告生成完成');
    console.log(
      '📋 报告包含',
      Object.keys(comprehensiveReport.sections).length,
      '个分析维度'
    );

    return { ...input, comprehensiveReport };
  }
}

// 🎯 主函数 - 运行LLM集成示例
async function runLLMIntegrationExample() {
  console.log('🤖 开始运行LLM集成示例\n');

  try {
    // 方式1: LLM驱动的动态工作流（模拟）
    console.log('🎯 方式1: 智能动态工作流');
    const dynamicWorkflow = WorkflowBuilder.create()
      .addTask(new AICodeAnalysisTask())
      .onTaskComplete('aiCodeAnalysis', async (result, context) => {
        const analysis = result?.aiAnalysis;
        const tasks: DAGTask[] = [];

        // 基于AI分析结果动态生成任务
        if (analysis?.issues?.includes('test-coverage')) {
          console.log('🎯 AI检测到测试覆盖率问题，添加测试生成任务');
          tasks.push(new AITestGeneratorTask());
        }

        if (analysis?.issues?.includes('performance')) {
          console.log('🎯 AI检测到性能问题，添加优化分析任务');
          tasks.push(new AIPerformanceOptimizerTask());
        }

        // 总是进行代码审查
        tasks.push(new AICodeReviewTask());

        return tasks;
      })
      .addDynamicStrategy({
        name: 'ai_documentation',
        condition: (context) => {
          const analysis = context.get('aiAnalysis') as any;
          return analysis?.recommendations?.some((r: string) =>
            r.includes('documentation')
          );
        },
        generator: async (context) => {
          console.log('🎯 AI建议添加文档，启动流式文档生成');
          return [new AIStreamingDocumentationTask()];
        },
        priority: 2,
      })
      .onContextChange('codeReview', async (reviewData: any, context) => {
        if (reviewData?.overallScore > 8) {
          console.log('🎯 代码质量良好，生成综合报告');
          return [new AIReportGeneratorTask()];
        }
        return [];
      })
      .withConfig({
        maxDynamicSteps: 15,
      })
      .build();

    // 执行智能工作流
    const startTime = Date.now();
    const result = await dynamicWorkflow.execute({
      projectPath: './src',
      analysisType: 'comprehensive',
    });

    const executionTime = Date.now() - startTime;

    // 显示结果
    console.log('\n🎉 LLM集成工作流执行完成！');
    console.log('='.repeat(60));
    console.log(`✅ 执行状态: ${result.success ? '成功' : '失败'}`);
    console.log(`⏱️  总执行时间: ${result.executionTime}ms`);
    console.log(`📊 实际执行时间: ${executionTime}ms`);
    console.log(`🤖 AI任务数: ${result.taskResults.size}`);
    console.log(`🎯 动态生成任务: ${result.dynamicTasksGenerated || 0}`);
    console.log(`📈 总执行步数: ${result.totalSteps || 0}`);

    if (result.success) {
      console.log('\n🧠 AI分析结果摘要:');

      // AI分析结果
      const aiAnalysis = result.data?.aiAnalysis;
      if (aiAnalysis) {
        console.log(`🏗️  项目类型: ${aiAnalysis.projectType || 'Unknown'}`);
        console.log(`🎯 复杂度: ${aiAnalysis.complexity || 'Medium'}`);
        console.log(`⚠️  发现问题: ${aiAnalysis.issues?.length || 0}个`);
      }

      // 代码审查结果
      const codeReview = result.data?.codeReview;
      if (codeReview) {
        console.log(`📊 代码评分: ${codeReview.overallScore}/10`);
        console.log(`🔍 审查问题: ${codeReview.issues?.length || 0}个`);
      }

      // 性能优化
      const perfOpt = result.data?.performanceOptimizations;
      if (perfOpt) {
        console.log(
          `⚡ 性能优化项: ${perfOpt.bundleOptimizations?.length || 0}个`
        );
      }

      // 生成的测试
      const tests = result.data?.generatedTests;
      if (tests) {
        console.log(`🧪 生成测试: ${tests.unitTests?.length || 0}个单元测试`);
        console.log(`📈 覆盖率提升: ${tests.coverageIncrease || 'N/A'}`);
      }

      // 文档
      const docs = result.data?.documentation;
      if (docs) {
        console.log(`📝 文档字数: ${docs.wordCount || 0}词`);
      }

      // 综合报告
      const report = result.data?.comprehensiveReport;
      if (report) {
        console.log(
          `📋 综合报告: ${
            report.sections ? Object.keys(report.sections).length : 0
          }个分析维度`
        );
        console.log(`🎯 建议措施: ${report.recommendations?.length || 0}项`);
      }
    } else {
      console.error('❌ 执行失败:', result.error?.message);
    }

    // 显示AI任务执行详情
    console.log('\n🤖 AI任务执行详情:');
    result.taskResults.forEach((taskResult, taskName) => {
      const status = taskResult.status === 'completed' ? '✅' : '❌';
      const isAI =
        taskName.includes('ai') || taskName.includes('AI') ? '🧠' : '🔧';
      console.log(
        `${isAI} ${status} ${taskName}: ${taskResult.status} (${taskResult.duration}ms)`
      );
    });

    // 方式2: 展示简化的LLM驱动工作流
    console.log('\n' + '='.repeat(60));
    console.log('🎯 方式2: 一行式LLM工作流（模拟）');

    // 注意：这里是模拟，实际使用需要真实的LLM API
    const simpleResult = await WorkflowBuilder.create()
      .withConfig({ maxDynamicSteps: 10 }) // 模拟配置
      .addDynamicStrategy({
        name: 'llm_planning_simulation',
        condition: () => true,
        generator: async () => [],
      })
      .build()
      .execute({ projectPath: './src' });

    console.log(
      `🚀 简化LLM工作流执行${simpleResult.success ? '成功' : '失败'}`
    );
    console.log(`📊 执行时间: ${simpleResult.executionTime}ms`);
  } catch (error) {
    console.error('💥 LLM集成工作流执行异常:', error);
  }
}

// 🚀 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('💡 注意: 这是模拟示例，实际使用需要配置真实的LLM API密钥\n');
  runLLMIntegrationExample().catch(console.error);
}

export { runLLMIntegrationExample };
