import { describe, it, expect, beforeEach } from '@jest/globals';
import { WorkflowBuilder, type DAGTask } from '../WorkflowBuilder';
import type { TaskInput } from '../Task';

// 🧠 模拟AI规划器任务
class MockAIPlannerTask implements DAGTask {
  name = 'aiPlanner';
  dependsOn: DAGTask[] = [];

  async execute(input: TaskInput): Promise<Record<string, any>> {
    const userRequest = input.userRequest || input.query || '';

    // 模拟AI分析用户请求并生成工作流规划
    await new Promise((resolve) => setTimeout(resolve, 50));

    const workflowPlan = this.generateWorkflowPlan(userRequest);

    return {
      ...input,
      workflowPlan,
      aiPlannerResult: {
        analyzed: true,
        requestType: this.detectRequestType(userRequest),
        confidence: 0.9,
        planningTime: Date.now(),
      },
    };
  }

  private detectRequestType(request: string): string {
    // 优先检测特定类型，避免被通用关键词覆盖
    if (request.includes('weather') || request.includes('天气')) {
      return 'weather-app';
    } else if (request.includes('React') || request.includes('TypeScript')) {
      return 'react-analysis';
    } else if (request.includes('Vue')) {
      return 'vue-analysis';
    } else if (request.includes('API') || request.includes('FastAPI')) {
      return 'api-development';
    } else if (request.includes('app') || request.includes('application')) {
      return 'app-development';
    } else {
      return 'general-analysis';
    }
  }

  private generateWorkflowPlan(userRequest: string): any {
    const requestType = this.detectRequestType(userRequest);

    switch (requestType) {
      case 'react-analysis':
        return {
          description: 'React TypeScript项目分析工作流',
          staticTasks: [
            {
              type: 'CodeScanTask',
              name: 'codeScan',
              config: { language: 'typescript' },
            },
            {
              type: 'DependencyAnalysisTask',
              name: 'depAnalysis',
              config: { framework: 'react' },
            },
          ],
          dynamicStrategies: [
            {
              type: 'onTaskComplete',
              name: 'qualityIssueStrategy',
              trigger: 'codeScan',
              condition: 'result.issues && result.issues.length > 0',
              generateTasks: [
                {
                  type: 'ESLintTask',
                  name: 'eslint',
                  config: { strict: true },
                },
                { type: 'TypeCheckTask', name: 'typecheck', config: {} },
              ],
            },
          ],
        };

      case 'vue-analysis':
        return {
          description: 'Vue.js项目分析工作流',
          staticTasks: [
            {
              type: 'VueAnalysisTask',
              name: 'vueAnalysis',
              config: { version: '3.x' },
            },
            {
              type: 'ComponentAnalysisTask',
              name: 'componentAnalysis',
              config: {},
            },
          ],
          dynamicStrategies: [
            {
              type: 'onContextChange',
              name: 'vueVersionStrategy',
              trigger: 'vueAnalysis',
              generateTasks: [
                {
                  type: 'Vue3MigrationTask',
                  name: 'migration',
                  config: { target: 'vue3' },
                },
              ],
            },
          ],
        };

      case 'weather-app':
        return {
          description: 'AI驱动的天气应用开发工作流',
          staticTasks: [
            {
              type: 'WebSearchTask',
              name: 'weatherApiResearch',
              config: { query: '2024最佳天气API', maxResults: 5 },
            },
            {
              type: 'FileOperationTask',
              name: 'projectSetup',
              config: { action: 'create', structure: 'fastapi-project' },
            },
          ],
          dynamicStrategies: [
            {
              type: 'onTaskComplete',
              name: 'apiSelectionStrategy',
              trigger: 'weatherApiResearch',
              generateTasks: [
                {
                  type: 'CodeGenerationTask',
                  name: 'weatherService',
                  config: {
                    component: 'weather-service',
                    framework: 'fastapi',
                  },
                },
                {
                  type: 'AIIntegrationTask',
                  name: 'aiFeatures',
                  config: { features: ['forecast-ai', 'weather-insights'] },
                },
              ],
            },
          ],
        };

      case 'api-development':
        return {
          description: 'API开发工作流',
          staticTasks: [
            {
              type: 'APIDesignTask',
              name: 'apiDesign',
              config: { framework: 'fastapi' },
            },
            {
              type: 'DatabaseDesignTask',
              name: 'dbDesign',
              config: { type: 'postgresql' },
            },
          ],
          dynamicStrategies: [
            {
              type: 'whenCondition',
              name: 'securityStrategy',
              condition: 'context.apiDesign.requiresAuth === true',
              generateTasks: [
                {
                  type: 'AuthImplementationTask',
                  name: 'auth',
                  config: { method: 'jwt' },
                },
                { type: 'SecurityAuditTask', name: 'security', config: {} },
              ],
            },
          ],
        };

      case 'app-development':
      case 'general-analysis':
        return {
          description: userRequest.includes('app')
            ? '应用开发工作流'
            : '通用分析工作流',
          staticTasks: [
            { type: 'GeneralAnalysisTask', name: 'analysis', config: {} },
          ],
          dynamicStrategies: [
            {
              type: 'onTaskComplete',
              name: 'completionStrategy',
              trigger: 'analysis',
              generateTasks: [
                {
                  type: 'ReportGenerationTask',
                  name: 'report',
                  config: { format: 'markdown' },
                },
              ],
            },
          ],
        };

      default:
        return {
          description: '通用分析工作流',
          staticTasks: [
            { type: 'GeneralAnalysisTask', name: 'analysis', config: {} },
          ],
          dynamicStrategies: [],
        };
    }
  }
}

// 🔧 模拟计划执行器
class MockPlanExecutor {
  static async executePlan(
    plan: any,
    context: Record<string, any>
  ): Promise<DAGTask[]> {
    const tasks: DAGTask[] = [];

    // 根据计划生成具体任务
    for (const taskDef of plan.staticTasks || []) {
      tasks.push(
        new MockExecutableTask(taskDef.name, taskDef.type, taskDef.config)
      );
    }

    // 模拟动态策略执行 - 为了测试目的，总是触发策略
    for (const strategy of plan.dynamicStrategies || []) {
      if (strategy.type === 'onTaskComplete') {
        // 模拟任务完成触发策略
        for (const taskDef of strategy.generateTasks || []) {
          tasks.push(
            new MockExecutableTask(taskDef.name, taskDef.type, taskDef.config)
          );
        }
      }
    }

    return tasks;
  }
}

// 📝 模拟可执行任务
class MockExecutableTask implements DAGTask {
  constructor(
    public name: string,
    private taskType: string,
    private config: any = {},
    public dependsOn: DAGTask[] = []
  ) {}

  async execute(input: TaskInput): Promise<Record<string, any>> {
    await new Promise((resolve) => setTimeout(resolve, 20));

    const result = {
      taskType: this.taskType,
      config: this.config,
      completed: true,
      timestamp: Date.now(),
    };

    // 基于任务类型生成不同的结果
    switch (this.taskType) {
      case 'CodeScanTask':
        Object.assign(result, {
          issues: ['unused-imports', 'missing-types'],
          codeQuality: 0.75,
          linesScanned: 1500,
        });
        break;

      case 'TypeCheckTask':
        Object.assign(result, {
          typeErrors: 2,
          warnings: 5,
          coverage: 0.85,
        });
        break;

      case 'WebSearchTask':
        Object.assign(result, {
          results: [
            {
              title: 'OpenWeatherMap API',
              url: 'openweathermap.org',
              rating: 4.8,
            },
            { title: 'WeatherAPI', url: 'weatherapi.com', rating: 4.6 },
          ],
          totalResults: 2,
        });
        break;

      case 'CodeGenerationTask':
        Object.assign(result, {
          generatedFiles: ['weather_service.py', 'models.py', 'routes.py'],
          linesGenerated: 450,
          quality: 'high',
        });
        break;

      case 'VueAnalysisTask':
        Object.assign(result, {
          vueVersion: '3.2.47',
          components: 12,
          compositionAPI: true,
        });
        break;

      default:
        Object.assign(result, {
          genericResult: `${this.taskType} completed successfully`,
        });
    }

    return { ...input, [this.name]: result };
  }
}

describe('WorkflowBuilder AI规划器测试', () => {
  describe('🧠 AI规划器基础功能', () => {
    it('应该能创建AI规划器任务', () => {
      const plannerTask = new MockAIPlannerTask();
      expect(plannerTask).toBeDefined();
      expect(plannerTask.name).toBe('aiPlanner');
    });

    it('应该能分析用户请求并生成工作流规划', async () => {
      const plannerTask = new MockAIPlannerTask();

      const result = await plannerTask.execute({
        userRequest: '分析我的React TypeScript项目并优化它',
      });

      expect(result.workflowPlan).toBeDefined();
      expect(result.workflowPlan.description).toContain('React TypeScript');
      expect(result.workflowPlan.staticTasks).toBeDefined();
      expect(result.workflowPlan.dynamicStrategies).toBeDefined();
      expect(result.aiPlannerResult.requestType).toBe('react-analysis');
    });

    it('应该能检测不同类型的请求', async () => {
      const plannerTask = new MockAIPlannerTask();

      // 测试Vue项目请求
      const vueResult = await plannerTask.execute({
        userRequest: '优化我的Vue.js应用',
      });
      expect(vueResult.aiPlannerResult.requestType).toBe('vue-analysis');

      // 测试天气应用请求
      const weatherResult = await plannerTask.execute({
        userRequest: '使用Python FastAPI创建带AI功能的天气应用',
      });
      expect(weatherResult.aiPlannerResult.requestType).toBe('weather-app');

      // 测试API开发请求
      const apiResult = await plannerTask.execute({
        userRequest: '构建一个FastAPI后端服务',
      });
      expect(apiResult.aiPlannerResult.requestType).toBe('api-development');
    });

    it('应该生成结构化的工作流配置', async () => {
      const plannerTask = new MockAIPlannerTask();

      const result = await plannerTask.execute({
        userRequest: '创建一个天气应用',
      });

      const plan = result.workflowPlan;
      expect(plan.description).toBeDefined();
      expect(plan.staticTasks).toBeInstanceOf(Array);
      expect(plan.dynamicStrategies).toBeInstanceOf(Array);

      // 验证静态任务结构
      plan.staticTasks.forEach((task: any) => {
        expect(task.type).toBeDefined();
        expect(task.name).toBeDefined();
        expect(task.config).toBeDefined();
      });

      // 验证动态策略结构
      plan.dynamicStrategies.forEach((strategy: any) => {
        expect(strategy.type).toBeDefined();
        expect(strategy.name).toBeDefined();
        expect(strategy.trigger).toBeDefined();
      });
    });
  });

  describe('🚀 AI规划器驱动的工作流执行', () => {
    it('应该能执行AI生成的工作流', async () => {
      const plannerTask = new MockAIPlannerTask();

      const workflow = WorkflowBuilder.create()
        .addTask(plannerTask)
        .onTaskComplete('aiPlanner', async (result, context) => {
          const plan = result?.workflowPlan;
          return await MockPlanExecutor.executePlan(plan, context.getAll());
        })
        .build();

      const result = await workflow.execute({
        userRequest: '分析我的React项目',
      });

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBeGreaterThan(0);
      expect(result.taskResults.size).toBeGreaterThan(1);
    });

    it('应该能处理复杂的多任务规划', async () => {
      const plannerTask = new MockAIPlannerTask();

      const workflow = WorkflowBuilder.create()
        .addTask(plannerTask)
        .onTaskComplete('aiPlanner', async (result, context) => {
          const plan = result?.workflowPlan;
          return await MockPlanExecutor.executePlan(plan, context.getAll());
        })
        .build();

      const result = await workflow.execute({
        userRequest: '使用FastAPI创建一个带AI功能的天气应用',
      });

      expect(result.success).toBe(true);
      expect(result.dynamicTasksGenerated).toBeGreaterThanOrEqual(4); // 基础任务 + 动态生成的任务

      // 验证特定任务的执行
      expect(result.taskResults.has('weatherApiResearch')).toBe(true);
      expect(result.taskResults.has('projectSetup')).toBe(true);
      expect(result.taskResults.has('weatherService')).toBe(true);
      expect(result.taskResults.has('aiFeatures')).toBe(true);
    });

    it('应该能基于中间结果动态调整工作流', async () => {
      const plannerTask = new MockAIPlannerTask();

      const workflow = WorkflowBuilder.create()
        .addTask(plannerTask)
        .onTaskComplete('aiPlanner', async (result, context) => {
          const plan = result?.workflowPlan;
          return await MockPlanExecutor.executePlan(plan, context.getAll());
        })
        .onTaskComplete('codeScan', async (result, context) => {
          // 基于代码扫描结果动态添加任务
          const scanResult = result as any;
          const tasks: DAGTask[] = [];

          // 修复数据访问 - result包含codeScan字段
          const scanData = scanResult?.codeScan || scanResult;

          if (scanData?.issues?.includes('unused-imports')) {
            tasks.push(
              new MockExecutableTask('cleanupTask', 'CleanupTask', {
                target: 'imports',
              })
            );
          }

          if (scanData?.codeQuality < 0.9) {
            tasks.push(
              new MockExecutableTask('qualityImprovementTask', 'QualityTask', {
                threshold: 0.9,
              })
            );
          }

          return tasks;
        })
        .build();

      const result = await workflow.execute({
        userRequest: '深度分析我的React TypeScript项目',
      });

      expect(result.success).toBe(true);
      expect(result.taskResults.has('codeScan')).toBe(true);
      expect(result.taskResults.has('cleanupTask')).toBe(true);
      expect(result.taskResults.has('qualityImprovementTask')).toBe(true);
    });
  });

  describe('🎯 智能策略生成', () => {
    it('应该生成基于条件的策略', async () => {
      const plannerTask = new MockAIPlannerTask();

      const result = await plannerTask.execute({
        userRequest: '构建一个需要认证的API服务',
      });

      const plan = result.workflowPlan;
      const conditionalStrategy = plan.dynamicStrategies.find(
        (s: any) => s.type === 'whenCondition'
      );

      expect(conditionalStrategy).toBeDefined();
      expect(conditionalStrategy.condition).toContain('requiresAuth');
      expect(conditionalStrategy.generateTasks).toBeInstanceOf(Array);
    });

    it('应该生成基于任务完成的策略', async () => {
      const plannerTask = new MockAIPlannerTask();

      const result = await plannerTask.execute({
        userRequest: '创建天气应用并集成AI功能',
      });

      const plan = result.workflowPlan;
      const completionStrategy = plan.dynamicStrategies.find(
        (s: any) => s.type === 'onTaskComplete'
      );

      expect(completionStrategy).toBeDefined();
      expect(completionStrategy.trigger).toBeDefined();
      expect(completionStrategy.generateTasks).toBeInstanceOf(Array);
      expect(completionStrategy.generateTasks.length).toBeGreaterThan(0);
    });

    it('应该生成基于上下文变化的策略', async () => {
      const plannerTask = new MockAIPlannerTask();

      const result = await plannerTask.execute({
        userRequest: '分析并升级我的Vue应用',
      });

      const plan = result.workflowPlan;
      const contextStrategy = plan.dynamicStrategies.find(
        (s: any) => s.type === 'onContextChange'
      );

      expect(contextStrategy).toBeDefined();
      expect(contextStrategy.trigger).toBeDefined();
    });
  });

  describe('📊 规划质量和优化', () => {
    it('应该提供规划的置信度评分', async () => {
      const plannerTask = new MockAIPlannerTask();

      const result = await plannerTask.execute({
        userRequest: '优化我的React应用性能',
      });

      expect(result.aiPlannerResult.confidence).toBeDefined();
      expect(result.aiPlannerResult.confidence).toBeGreaterThan(0);
      expect(result.aiPlannerResult.confidence).toBeLessThanOrEqual(1);
    });

    it('应该跟踪规划时间', async () => {
      const plannerTask = new MockAIPlannerTask();

      const startTime = Date.now();
      const result = await plannerTask.execute({
        userRequest: '创建一个全栈应用',
      });
      const endTime = Date.now();

      expect(result.aiPlannerResult.planningTime).toBeDefined();
      expect(result.aiPlannerResult.planningTime).toBeGreaterThanOrEqual(
        startTime
      );
      expect(result.aiPlannerResult.planningTime).toBeLessThanOrEqual(endTime);
    });

    it('应该优化任务依赖关系', async () => {
      const plannerTask = new MockAIPlannerTask();

      const workflow = WorkflowBuilder.create()
        .addTask(plannerTask)
        .onTaskComplete('aiPlanner', async (result, context) => {
          const plan = result?.workflowPlan;
          const tasks = await MockPlanExecutor.executePlan(
            plan,
            context.getAll()
          );

          // 验证任务依赖优化
          const setupTask = tasks.find((t) => t.name === 'projectSetup');
          const serviceTask = tasks.find((t) => t.name === 'weatherService');

          if (setupTask && serviceTask) {
            // 确保服务任务依赖于项目设置
            serviceTask.dependsOn = [setupTask];
          }

          return tasks;
        })
        .build();

      const result = await workflow.execute({
        userRequest: '创建天气API服务',
      });

      expect(result.success).toBe(true);

      // 验证执行顺序
      const history = workflow.getContext().getExecutionHistory();
      const setupIndex = history.findIndex(
        (h) => h.taskName === 'projectSetup'
      );
      const serviceIndex = history.findIndex(
        (h) => h.taskName === 'weatherService'
      );

      if (setupIndex !== -1 && serviceIndex !== -1) {
        expect(setupIndex).toBeLessThan(serviceIndex);
      }
    });
  });

  describe('🔧 边界情况和错误处理', () => {
    it('应该处理未知类型的请求', async () => {
      const plannerTask = new MockAIPlannerTask();

      const result = await plannerTask.execute({
        userRequest: '这是一个完全无法识别的奇怪请求',
      });

      expect(result.workflowPlan).toBeDefined();
      expect(result.workflowPlan.description).toContain('通用分析');
      expect(result.aiPlannerResult.requestType).toBe('general-analysis');
    });

    it('应该处理空的用户请求', async () => {
      const plannerTask = new MockAIPlannerTask();

      const result = await plannerTask.execute({
        userRequest: '',
      });

      expect(result.workflowPlan).toBeDefined();
      expect(result.aiPlannerResult).toBeDefined();
    });

    it('应该处理计划执行失败', async () => {
      const failingPlannerTask = new MockAIPlannerTask();

      // 重写execute方法来模拟失败
      failingPlannerTask.execute = async (input: TaskInput) => {
        throw new Error('AI规划器执行失败');
      };

      const workflow = WorkflowBuilder.create()
        .addTask(failingPlannerTask)
        .build();

      const result = await workflow.execute({
        userRequest: '测试失败情况',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('应该处理计划生成的循环依赖', async () => {
      const plannerTask = new MockAIPlannerTask();

      const workflow = WorkflowBuilder.create()
        .addTask(plannerTask)
        .onTaskComplete('aiPlanner', async (result, context) => {
          // 创建有循环依赖的任务
          const task1 = new MockExecutableTask('task1', 'Task1', {});
          const task2 = new MockExecutableTask('task2', 'Task2', {});

          task1.dependsOn = [task2];
          task2.dependsOn = [task1]; // 循环依赖

          return [task1, task2];
        })
        .build();

      const result = await workflow.execute({
        userRequest: '测试循环依赖',
      });

      // 应该检测到循环依赖并失败
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Circular dependency');
    });

    it('应该限制AI生成的任务数量', async () => {
      const plannerTask = new MockAIPlannerTask();

      const workflow = WorkflowBuilder.create()
        .addTask(plannerTask)
        .onTaskComplete('aiPlanner', async (result, context) => {
          // 尝试生成大量任务
          const tasks: DAGTask[] = [];
          for (let i = 0; i < 100; i++) {
            tasks.push(new MockExecutableTask(`task${i}`, 'GenericTask', {}));
          }
          return tasks;
        })
        .withConfig({ maxDynamicSteps: 10 }) // 限制动态步数
        .build();

      const result = await workflow.execute({
        userRequest: '生成大量任务测试',
      });

      expect(result.success).toBe(true);
      expect(result.totalSteps).toBeLessThanOrEqual(10);
    });
  });
});
