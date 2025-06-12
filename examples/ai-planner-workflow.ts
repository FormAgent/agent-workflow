#!/usr/bin/env tsx

import { WorkflowBuilder, DAGTask } from '../src/workflow/WorkflowBuilder';
import type { TaskInput } from '../src/workflow/Task';

/**
 * 🧠 AI Planner 工作流示例
 *
 * 本示例展示：
 * 1. 如何创建智能Planner任务
 * 2. 如何根据Planner的JSON输出动态生成工作流
 * 3. 如何模拟LLM规划能力
 * 4. 完整的Agent协作流程
 */

// 🧠 AI Planner任务 - 规划后续工作流
class AIPlannerTask extends DAGTask {
  name = 'aiPlanner';

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    const userRequest = input.userRequest || input.query || '';
    console.log(`🧠 AI Planner 开始分析请求: "${userRequest}"`);

    // 模拟LLM分析延迟
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 智能规划逻辑
    const workflowPlan = this.generateWorkflowPlan(userRequest);

    console.log('📋 AI Planner 生成工作流计划:');
    console.log(JSON.stringify(workflowPlan, null, 2));

    return {
      ...input,
      workflowPlan,
      plannedTasks: workflowPlan.staticTasks,
      plannedStrategies: workflowPlan.dynamicStrategies,
      planningComplete: true,
    };
  }

  private generateWorkflowPlan(userRequest: string): any {
    const request = userRequest.toLowerCase();

    // 分析用户请求并生成相应的工作流计划
    if (request.includes('weather app') || request.includes('天气应用')) {
      return {
        description: 'AI-powered weather application development workflow',
        staticTasks: [
          {
            type: 'WebSearchTask',
            name: 'weatherApiResearch',
            config: {
              query: 'best weather APIs 2024 free tier',
              maxResults: 5,
            },
          },
          {
            type: 'FileOperationTask',
            name: 'projectSetup',
            config: {
              action: 'create',
              structure: 'fastapi-project',
              features: ['ai', 'weather', 'api'],
            },
          },
        ],
        dynamicStrategies: [
          {
            type: 'onTaskComplete',
            name: 'apiSelectionStrategy',
            description: 'Choose weather API and generate integration code',
            trigger: 'After weather API research completes',
            generateTasks: [
              {
                type: 'CodeGenerationTask',
                name: 'weatherService',
                config: {
                  component: 'weather-service',
                  framework: 'fastapi',
                  integrations: ['openweathermap'],
                },
              },
            ],
          },
        ],
      };
    } else if (request.includes('react') && request.includes('analyze')) {
      return {
        description:
          'Comprehensive React TypeScript project analysis and optimization',
        staticTasks: [
          {
            type: 'FileOperationTask',
            name: 'projectScan',
            config: {
              action: 'scan',
              pattern: '**/*.{ts,tsx,js,jsx,json}',
              output: 'fileList',
            },
          },
          {
            type: 'CodeAnalysisTask',
            name: 'initialAnalysis',
            config: {
              framework: 'react',
              language: 'typescript',
              checks: ['quality', 'complexity', 'dependencies'],
            },
            dependsOn: ['projectScan'],
          },
        ],
        dynamicStrategies: [
          {
            type: 'onTaskComplete',
            name: 'analysisBasedOptimization',
            description:
              'Generate optimization tasks based on analysis results',
            trigger: 'When initialAnalysis completes',
            generateTasks: [
              {
                type: 'SecurityAuditTask',
                name: 'securityCheck',
                condition: 'hasSecurityIssues',
                config: { severity: 'medium' },
              },
              {
                type: 'PerformanceOptimizationTask',
                name: 'performanceOpt',
                condition: 'hasPerformanceIssues',
                config: { targets: ['bundle', 'runtime'] },
              },
            ],
          },
        ],
      };
    } else {
      // 默认通用分析流程
      return {
        description: 'General project analysis and assistance workflow',
        staticTasks: [
          {
            type: 'ConversationalTask',
            name: 'queryAnalysis',
            config: {
              task: 'analyze user intent and requirements',
              output: 'structured analysis',
            },
          },
          {
            type: 'WebSearchTask',
            name: 'informationGathering',
            config: {
              query: userRequest,
              maxResults: 3,
            },
          },
        ],
        dynamicStrategies: [
          {
            type: 'onTaskComplete',
            name: 'adaptiveResponse',
            description:
              'Generate appropriate response tasks based on analysis',
            trigger: 'After query analysis completes',
            generateTasks: [
              {
                type: 'ConversationalTask',
                name: 'responseGeneration',
                config: {
                  task: 'provide helpful response based on analysis',
                  format: 'structured',
                },
              },
            ],
          },
        ],
      };
    }
  }
}

// 🔍 文件操作任务
class FileOperationTask extends DAGTask {
  name = 'fileOperation';

  constructor(
    private taskName: string,
    private config: any,
    dependencies: DAGTask[] = []
  ) {
    super(dependencies);
    this.name = taskName;
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log(`📁 执行文件操作: ${this.config.action}`);

    if (this.config.action === 'scan') {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        ...input,
        [this.name]: {
          action: 'scan',
          filesFound: 45,
          fileTypes: ['ts', 'tsx', 'js', 'json'],
          pattern: this.config.pattern,
          completed: true,
        },
      };
    } else if (this.config.action === 'create') {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        ...input,
        [this.name]: {
          action: 'create',
          projectStructure: 'created',
          framework: this.config.structure,
          features: this.config.features,
          completed: true,
        },
      };
    }

    return {
      ...input,
      [this.name]: { action: this.config.action, completed: true },
    };
  }
}

// 🔍 网络搜索任务
class WebSearchTask extends DAGTask {
  name = 'webSearch';

  constructor(
    private taskName: string,
    private config: any,
    dependencies: DAGTask[] = []
  ) {
    super(dependencies);
    this.name = taskName;
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log(`🌐 执行网络搜索: "${this.config.query}"`);

    await new Promise((resolve) => setTimeout(resolve, 600));

    const mockResults = [
      {
        title: 'OpenWeatherMap API - Free Weather Data',
        url: 'https://openweathermap.org/api',
        snippet: 'Get weather data for any location with our API...',
      },
      {
        title: 'AccuWeather API Documentation',
        url: 'https://developer.accuweather.com/',
        snippet: 'Comprehensive weather forecasting API...',
      },
    ].slice(0, this.config.maxResults || 5);

    return {
      ...input,
      [this.name]: {
        query: this.config.query,
        results: mockResults,
        count: mockResults.length,
        completed: true,
      },
    };
  }
}

// 💬 对话任务
class ConversationalTask extends DAGTask {
  name = 'conversational';

  constructor(
    private taskName: string,
    private config: any,
    dependencies: DAGTask[] = []
  ) {
    super(dependencies);
    this.name = taskName;
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log(`💬 执行对话任务: ${this.config.task}`);

    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
      ...input,
      [this.name]: {
        task: this.config.task,
        response: '基于分析，我为您提供了详细的建议和解决方案。',
        format: this.config.format || 'text',
        completed: true,
      },
    };
  }
}

// 💻 代码生成任务
class CodeGenerationTask extends DAGTask {
  name = 'codeGeneration';

  constructor(
    private taskName: string,
    private config: any,
    dependencies: DAGTask[] = []
  ) {
    super(dependencies);
    this.name = taskName;
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log(
      `💻 执行代码生成: ${this.config.component || this.config.feature}`
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      ...input,
      [this.name]: {
        component: this.config.component,
        framework: this.config.framework,
        codeGenerated: true,
        files: [`${this.config.component || this.config.feature}.py`],
        completed: true,
      },
    };
  }
}

// 🔍 代码分析任务
class CodeAnalysisTask extends DAGTask {
  name = 'codeAnalysis';

  constructor(
    private taskName: string,
    private config: any,
    dependencies: DAGTask[] = []
  ) {
    super(dependencies);
    this.name = taskName;
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log(
      `🔍 执行代码分析: ${this.config.framework} ${this.config.language}`
    );

    await new Promise((resolve) => setTimeout(resolve, 900));

    return {
      ...input,
      [this.name]: {
        framework: this.config.framework,
        language: this.config.language,
        quality: 8.2,
        complexity: 0.65,
        issues: ['test-coverage', 'performance'],
        hasSecurityIssues: false,
        hasPerformanceIssues: true,
        completed: true,
      },
    };
  }
}

// 🛡️ 安全审计任务
class SecurityAuditTask extends DAGTask {
  name = 'securityAudit';

  constructor(
    private taskName: string,
    private config: any,
    dependencies: DAGTask[] = []
  ) {
    super(dependencies);
    this.name = taskName;
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log(`🛡️ 执行安全审计: 严重度 ${this.config.severity}`);

    await new Promise((resolve) => setTimeout(resolve, 700));

    return {
      ...input,
      [this.name]: {
        severity: this.config.severity,
        vulnerabilities: 0,
        score: 95,
        recommendations: ['更新依赖包', '启用HTTPS'],
        completed: true,
      },
    };
  }
}

// ⚡ 性能优化任务
class PerformanceOptimizationTask extends DAGTask {
  name = 'performanceOpt';

  constructor(
    private taskName: string,
    private config: any,
    dependencies: DAGTask[] = []
  ) {
    super(dependencies);
    this.name = taskName;
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log(`⚡ 执行性能优化: ${this.config.targets.join(', ')}`);

    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      ...input,
      [this.name]: {
        targets: this.config.targets,
        improvements: {
          bundleSize: '-25%',
          loadTime: '-30%',
        },
        completed: true,
      },
    };
  }
}

// 🏗️ 工作流执行器 - 根据Plan执行动态工作流
class PlanExecutor {
  static async executePlan(plan: any, initialInput: TaskInput): Promise<any> {
    console.log('🚀 开始执行AI规划的工作流');

    const workflow = WorkflowBuilder.create();

    // 添加静态任务
    for (const taskDef of plan.staticTasks || []) {
      const task = this.createTaskFromDefinition(taskDef);
      workflow.addTask(task);
    }

    // 添加动态策略
    for (const strategyDef of plan.dynamicStrategies || []) {
      if (strategyDef.type === 'onTaskComplete') {
        workflow.onTaskComplete(
          strategyDef.trigger.split(' ').pop(),
          async (result, context) => {
            const tasks = [];
            for (const taskDef of strategyDef.generateTasks) {
              // 检查条件
              if (taskDef.condition) {
                const analysisResult = context.get('initialAnalysis') as any;
                if (
                  taskDef.condition === 'hasSecurityIssues' &&
                  !analysisResult?.hasSecurityIssues
                ) {
                  continue;
                }
                if (
                  taskDef.condition === 'hasPerformanceIssues' &&
                  !analysisResult?.hasPerformanceIssues
                ) {
                  continue;
                }
              }
              tasks.push(this.createTaskFromDefinition(taskDef));
            }
            return tasks;
          }
        );
      } else if (strategyDef.type === 'whenCondition') {
        workflow.whenCondition(
          (context) => {
            // 根据策略定义检查条件
            return true; // 简化示例
          },
          async (context) => {
            return strategyDef.generateTasks.map((taskDef: any) =>
              this.createTaskFromDefinition(taskDef)
            );
          }
        );
      }
    }

    // 执行工作流
    const result = await workflow.build().execute(initialInput);
    return result;
  }

  private static createTaskFromDefinition(taskDef: any): DAGTask {
    switch (taskDef.type) {
      case 'FileOperationTask':
        return new FileOperationTask(taskDef.name, taskDef.config);
      case 'WebSearchTask':
        return new WebSearchTask(taskDef.name, taskDef.config);
      case 'ConversationalTask':
        return new ConversationalTask(taskDef.name, taskDef.config);
      case 'CodeGenerationTask':
        return new CodeGenerationTask(taskDef.name, taskDef.config);
      case 'CodeAnalysisTask':
        return new CodeAnalysisTask(taskDef.name, taskDef.config);
      case 'SecurityAuditTask':
        return new SecurityAuditTask(taskDef.name, taskDef.config);
      case 'PerformanceOptimizationTask':
        return new PerformanceOptimizationTask(taskDef.name, taskDef.config);
      default:
        throw new Error(`未知的任务类型: ${taskDef.type}`);
    }
  }
}

// 🚀 主函数 - 运行AI Planner工作流示例
async function runAIPlannerExample() {
  console.log('🧠 AI Planner 工作流示例\n');

  try {
    // 测试1: React项目分析
    console.log('='.repeat(60));
    console.log('🧪 测试1: React TypeScript项目分析');

    const plannerWorkflow = WorkflowBuilder.create()
      .addTask(new AIPlannerTask())
      .onTaskComplete('aiPlanner', async (result, context) => {
        console.log('\n🎯 AI Planner完成，开始执行规划的工作流...');
        const plan = result?.workflowPlan;

        if (plan) {
          // 在同一个工作流中继续执行规划的任务
          const plannedResult = await PlanExecutor.executePlan(
            plan,
            context.getAll()
          );
          console.log(
            '\n📊 规划工作流执行结果:',
            plannedResult.success ? '成功' : '失败'
          );
          return [];
        }
        return [];
      })
      .build();

    const result1 = await plannerWorkflow.execute({
      userRequest: 'Analyze my React TypeScript project and optimize it',
    });

    console.log('\n📋 测试1结果:');
    console.log(`✅ 执行状态: ${result1.success ? '成功' : '失败'}`);
    console.log(`⏱️  执行时间: ${result1.executionTime}ms`);
    console.log(`🎯 动态任务: ${result1.dynamicTasksGenerated || 0}`);

    // 测试2: 天气应用开发
    console.log('\n' + '='.repeat(60));
    console.log('🧪 测试2: AI驱动的天气应用开发');

    const result2 = await plannerWorkflow.execute({
      userRequest: 'Create a weather app with AI features using Python FastAPI',
    });

    console.log('\n📋 测试2结果:');
    console.log(`✅ 执行状态: ${result2.success ? '成功' : '失败'}`);
    console.log(`⏱️  执行时间: ${result2.executionTime}ms`);
    console.log(`🎯 动态任务: ${result2.dynamicTasksGenerated || 0}`);

    // 测试3: 通用查询
    console.log('\n' + '='.repeat(60));
    console.log('🧪 测试3: 通用AI助手查询');

    const result3 = await plannerWorkflow.execute({
      userRequest: 'How can I improve my TypeScript skills?',
    });

    console.log('\n📋 测试3结果:');
    console.log(`✅ 执行状态: ${result3.success ? '成功' : '失败'}`);
    console.log(`⏱️  执行时间: ${result3.executionTime}ms`);
    console.log(`🎯 动态任务: ${result3.dynamicTasksGenerated || 0}`);

    console.log('\n🎉 AI Planner工作流演示完成！');
    console.log('\n💡 核心特性展示:');
    console.log('✅ 智能请求分析和工作流规划');
    console.log('✅ 基于JSON配置的动态任务生成');
    console.log('✅ 条件策略和任务完成策略');
    console.log('✅ 复杂多步骤工作流的自动化执行');
    console.log('✅ 完整的错误处理和状态管理');
  } catch (error) {
    console.error('💥 AI Planner工作流执行异常:', error);
  }
}

// 🚀 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎯 本示例展示AI Planner如何智能规划和执行复杂工作流\n');
  runAIPlannerExample().catch(console.error);
}

export {
  AIPlannerTask,
  PlanExecutor,
  runAIPlannerExample,
  FileOperationTask,
  WebSearchTask,
  ConversationalTask,
  CodeGenerationTask,
};
