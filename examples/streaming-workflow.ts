#!/usr/bin/env tsx

/**
 * 🌊 流式工作流示例
 *
 * 本示例展示：
 * 1. 实时流式任务执行
 * 2. 流式数据返回给前端
 * 3. 进度实时更新
 * 4. LLM流式响应处理
 * 5. 前端友好的数据格式
 *
 * 这是专门为前端实时显示设计的工作流执行模式
 */

// 🌊 流式数据块接口
interface StreamingChunk {
  type: 'progress' | 'data' | 'error' | 'complete';
  taskName: string;
  content?: any;
  progress?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// 🧠 模拟LLM流式服务
class MockStreamingLLMService {
  static async *generateAnalysisStream(
    prompt: string
  ): AsyncGenerator<string, any, unknown> {
    const responses = [
      '🔍 开始分析项目结构...',
      '📂 扫描源码目录',
      '🔎 检测项目类型: React + TypeScript',
      '⚡ 分析组件依赖关系...',
      '📊 统计代码指标:',
      '  - 总文件数: 127',
      '  - 代码行数: 8,432',
      '  - 组件数量: 23',
      '🚨 发现潜在问题:',
      '  - 缺少单元测试覆盖',
      '  - 存在重复代码片段',
      '  - 部分组件过于复杂',
      '💡 生成优化建议:',
      '  1. 添加 Jest 测试框架',
      '  2. 重构大型组件',
      '  3. 提取公共工具函数',
      '✅ 分析完成，生成详细报告...',
    ];

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      await new Promise((resolve) => setTimeout(resolve, 300));
      yield response;

      // 在特定步骤返回结构化数据
      if (i === 7) {
        yield JSON.stringify({
          type: 'metrics',
          data: {
            files: 127,
            lines: 8432,
            components: 23,
            complexity: 6.2,
          },
        });
      }

      if (i === 11) {
        yield JSON.stringify({
          type: 'issues',
          data: [
            { type: 'test-coverage', severity: 'high', count: 23 },
            { type: 'code-duplication', severity: 'medium', count: 8 },
            { type: 'complexity', severity: 'medium', count: 5 },
          ],
        });
      }
    }

    return {
      summary: '项目代码质量分析完成',
      score: 7.5,
      issues: 36,
      recommendations: 12,
    };
  }

  static async *generateOptimizationStream(): AsyncGenerator<
    string,
    any,
    unknown
  > {
    const steps = [
      '🚀 开始性能优化分析...',
      '📦 分析打包体积',
      '🔧 检测未使用的依赖',
      '⚡ 识别性能瓶颈',
      '💾 分析内存使用',
      '🎯 生成优化方案:',
      '  - Bundle 分割优化',
      '  - 图片懒加载',
      '  - 代码分割策略',
      '  - 缓存策略优化',
      '✅ 性能优化方案生成完成',
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      yield step;
    }

    return {
      bundleReduction: '28%',
      loadTimeImprovement: '45%',
      optimizations: 8,
    };
  }
}

// 🔍 流式代码分析任务
class StreamingCodeAnalysisTask {
  name = 'streamingCodeAnalysis';
  isStreaming = true;

  async execute(input: any): Promise<Record<string, any>> {
    // 保留非流式执行的兼容性
    const result = {
      analysis: 'Static analysis completed',
      timestamp: Date.now(),
    };
    return { ...input, ...result };
  }

  async *executeStream(
    input: any
  ): AsyncGenerator<string, Record<string, any>, unknown> {
    console.log('🧠 开始流式代码分析...');

    let analysisData: any = {};

    const generator = MockStreamingLLMService.generateAnalysisStream(
      'Analyze this codebase'
    );

    for await (const chunk of generator) {
      // 尝试解析JSON数据
      try {
        const jsonData = JSON.parse(chunk);
        if (jsonData.type === 'metrics') {
          analysisData.metrics = jsonData.data;
        } else if (jsonData.type === 'issues') {
          analysisData.issues = jsonData.data;
        }
      } catch {
        // 非JSON数据，作为普通文本流式输出
      }

      yield chunk;
    }

    // 生成最终结果
    const finalResult = {
      analysis: {
        ...analysisData,
        summary: '代码分析完成',
        timestamp: Date.now(),
      },
    };

    console.log('✅ 流式代码分析完成');
    return { ...input, ...finalResult };
  }
}

// 🚀 流式性能优化任务
class StreamingPerformanceTask {
  name = 'streamingPerformance';
  isStreaming = true;

  async execute(input: any): Promise<Record<string, any>> {
    const result = {
      performance: 'Performance analysis completed',
      timestamp: Date.now(),
    };
    return { ...input, ...result };
  }

  async *executeStream(
    input: any
  ): AsyncGenerator<string, Record<string, any>, unknown> {
    console.log('🚀 开始流式性能分析...');

    const generator = MockStreamingLLMService.generateOptimizationStream();

    for await (const chunk of generator) {
      yield chunk;
    }

    const finalResult = {
      performance: {
        optimization: 'Performance optimization completed',
        improvements: ['bundle-splitting', 'lazy-loading', 'caching'],
        timestamp: Date.now(),
      },
    };

    console.log('✅ 流式性能分析完成');
    return { ...input, ...finalResult };
  }
}

// 📝 流式报告生成任务
class StreamingReportTask {
  name = 'streamingReport';
  isStreaming = true;
  dependsOn?: any[];

  constructor(dependencies: any[]) {
    this.dependsOn = dependencies;
  }

  async execute(input: any): Promise<Record<string, any>> {
    const result = { report: 'Report generated', timestamp: Date.now() };
    return { ...input, ...result };
  }

  async *executeStream(
    input: any
  ): AsyncGenerator<string, Record<string, any>, unknown> {
    console.log('📝 开始生成流式报告...');

    const reportSteps = [
      '📊 整合分析数据...',
      '📈 生成图表和统计...',
      '💡 生成改进建议...',
      '📄 格式化最终报告...',
      '✅ 报告生成完成！',
    ];

    for (const step of reportSteps) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      yield step;
    }

    const { analysis, performance } = input;

    const finalResult = {
      report: {
        title: '项目分析综合报告',
        sections: {
          codeAnalysis: analysis,
          performanceOptimization: performance,
        },
        generatedAt: new Date().toISOString(),
        recommendations: [
          '优先解决高优先级代码问题',
          '实施性能优化建议',
          '建立持续集成流程',
        ],
      },
    };

    console.log('✅ 流式报告生成完成');
    return { ...input, ...finalResult };
  }
}

// 🌊 简化的流式工作流实现
class SimpleStreamingWorkflow {
  private tasks: any[] = [];

  addTask(task: any): this {
    this.tasks.push(task);
    return this;
  }

  async *executeStream(
    input: any = {}
  ): AsyncGenerator<StreamingChunk, any, unknown> {
    console.log('🌊 开始执行流式工作流...\n');

    const startTime = Date.now();
    const results: Record<string, any> = { ...input };
    let completedTasks = 0;

    try {
      // 发送开始信号
      yield {
        type: 'progress',
        taskName: 'workflow',
        content: '工作流开始执行',
        progress: 0,
        timestamp: Date.now(),
      };

      // 简单的依赖解析（假设按顺序执行）
      for (const task of this.tasks) {
        const taskStartTime = Date.now();

        yield {
          type: 'progress',
          taskName: task.name,
          content: `开始执行任务: ${task.name}`,
          progress: 0,
          timestamp: Date.now(),
        };

        let taskResult: any;

        if (task.isStreaming && task.executeStream) {
          // 流式任务执行
          const generator = task.executeStream(results);

          try {
            let done = false;
            while (!done) {
              const { value, done: generatorDone } = await generator.next();
              done = generatorDone;

              if (!done) {
                // 流式数据
                yield {
                  type: 'data',
                  taskName: task.name,
                  content: value,
                  timestamp: Date.now(),
                };
              } else {
                // 最终结果
                taskResult = value;
              }
            }
          } catch (error) {
            // 如果生成器没有返回值，调用普通执行方法
            taskResult = await task.execute(results);
          }
        } else {
          // 普通任务执行
          taskResult = await task.execute(results);
        }

        // 合并结果
        Object.assign(results, taskResult);
        completedTasks++;

        const taskDuration = Date.now() - taskStartTime;

        yield {
          type: 'complete',
          taskName: task.name,
          content: `任务完成: ${task.name}`,
          progress: 100,
          timestamp: Date.now(),
          metadata: {
            duration: taskDuration,
            output: taskResult,
          },
        };

        // 整体进度更新
        yield {
          type: 'progress',
          taskName: 'workflow',
          content: `已完成 ${completedTasks}/${this.tasks.length} 个任务`,
          progress: Math.round((completedTasks / this.tasks.length) * 100),
          timestamp: Date.now(),
        };
      }

      const totalDuration = Date.now() - startTime;

      yield {
        type: 'complete',
        taskName: 'workflow',
        content: '工作流执行完成',
        progress: 100,
        timestamp: Date.now(),
        metadata: {
          totalDuration,
          tasksCompleted: completedTasks,
          success: true,
        },
      };

      return {
        success: true,
        data: results,
        executionTime: totalDuration,
        tasksCompleted: completedTasks,
      };
    } catch (error) {
      yield {
        type: 'error',
        taskName: 'workflow',
        content: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };

      return {
        success: false,
        error: error,
        executionTime: Date.now() - startTime,
        tasksCompleted: completedTasks,
      };
    }
  }
}

// 🎯 前端显示辅助函数
function formatStreamChunkForFrontend(chunk: StreamingChunk) {
  const timestamp = new Date(chunk.timestamp).toLocaleTimeString();

  switch (chunk.type) {
    case 'progress':
      return `[${timestamp}] 📊 ${chunk.content} (${chunk.progress || 0}%)`;
    case 'data':
      return `[${timestamp}] 💬 ${chunk.taskName}: ${chunk.content}`;
    case 'complete':
      const duration = chunk.metadata?.duration
        ? ` (${chunk.metadata.duration}ms)`
        : '';
      return `[${timestamp}] ✅ ${chunk.content}${duration}`;
    case 'error':
      return `[${timestamp}] ❌ 错误: ${chunk.content}`;
    default:
      return `[${timestamp}] ℹ️  ${chunk.content}`;
  }
}

// 🚀 主函数 - 运行流式工作流示例
async function runStreamingWorkflowExample() {
  console.log('🌊 开始运行流式工作流示例\n');

  try {
    // 创建流式任务
    const analysisTask = new StreamingCodeAnalysisTask();
    const performanceTask = new StreamingPerformanceTask();
    const reportTask = new StreamingReportTask([analysisTask, performanceTask]);

    // 方法1: 使用简化的流式工作流
    console.log('🎯 方法1: 简化流式工作流');
    console.log('='.repeat(60));

    const streamingWorkflow = new SimpleStreamingWorkflow()
      .addTask(analysisTask)
      .addTask(performanceTask)
      .addTask(reportTask);

    console.log('🔄 开始流式执行，实时输出：\n');

    const streamGenerator = streamingWorkflow.executeStream({
      projectPath: './src',
      analysisType: 'comprehensive',
    });

    // 模拟前端实时接收数据
    let finalResult: any;

    for await (const chunk of streamGenerator) {
      // 格式化显示给前端
      console.log(formatStreamChunkForFrontend(chunk));

      // 在实际应用中，这里会通过WebSocket或SSE发送给前端
      // ws.send(JSON.stringify(chunk));
      // 或者 res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    // 获取最终结果
    const { value: result } = await streamGenerator.next();
    finalResult = result;

    console.log('\n' + '='.repeat(60));
    console.log('🎉 流式工作流执行完成！');
    console.log(`✅ 状态: ${finalResult?.success ? '成功' : '失败'}`);
    console.log(`⏱️  总时间: ${finalResult?.executionTime || 0}ms`);
    console.log(`📊 完成任务: ${finalResult?.tasksCompleted || 0}`);

    if (finalResult?.success && finalResult?.data?.report) {
      console.log('\n📋 最终报告摘要:');
      const report = finalResult.data.report;
      console.log(`📄 标题: ${report.title}`);
      console.log(`📈 建议数量: ${report.recommendations?.length || 0}`);
      console.log(`🕒 生成时间: ${report.generatedAt}`);
    }

    // 方法2: 展示如何与前端集成
    console.log('\n' + '='.repeat(60));
    console.log('🎯 方法2: 前端集成示例');
    console.log('='.repeat(60));

    console.log(`
💡 前端集成示例代码:

// 1. 服务端 (Express + SSE)
app.get('/api/workflow/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const workflow = new SimpleStreamingWorkflow()
    .addTask(new StreamingCodeAnalysisTask())
    .addTask(new StreamingPerformanceTask());

  for await (const chunk of workflow.executeStream(req.body)) {
    res.write(\`data: \${JSON.stringify(chunk)}\\n\\n\`);
  }
  
  res.end();
});

// 2. 前端 (React)
function WorkflowProgress() {
  const [messages, setMessages] = useState([]);
  const [progress, setProgress] = useState(0);

  const startWorkflow = () => {
    const eventSource = new EventSource('/api/workflow/stream');
    
    eventSource.onmessage = (event) => {
      const chunk = JSON.parse(event.data);
      
      if (chunk.type === 'progress') {
        setProgress(chunk.progress);
      } else if (chunk.type === 'data') {
        setMessages(prev => [...prev, chunk.content]);
      }
    };
    
    eventSource.onerror = () => eventSource.close();
  };

  return (
    <div>
      <progress value={progress} max={100} />
      {messages.map((msg, i) => <div key={i}>{msg}</div>)}
    </div>
  );
}

// 3. WebSocket 版本
const ws = new WebSocket('ws://localhost:3000/workflow');
ws.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  // 实时更新UI
  updateProgress(chunk);
};

// 4. 带Vue的示例
const { ref, onMounted } = Vue;

export default {
  setup() {
    const messages = ref([]);
    const progress = ref(0);
    const isRunning = ref(false);

    const startWorkflow = async () => {
      isRunning.value = true;
      messages.value = [];
      progress.value = 0;

      try {
        const response = await fetch('/api/workflow/stream');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                progress.value = data.progress;
              } else if (data.type === 'data') {
                messages.value.push(data.content);
              }
            }
          }
        }
      } finally {
        isRunning.value = false;
      }
    };

    return { messages, progress, isRunning, startWorkflow };
  }
};
    `);

    console.log('\n🌟 流式工作流的优势:');
    console.log('  ✨ 实时反馈，用户体验更好');
    console.log('  🚀 支持长时间运行的任务');
    console.log('  📊 进度可视化');
    console.log('  🔄 可中断和恢复');
    console.log('  💬 实时LLM响应展示');
    console.log('  🎯 前端友好的数据格式');

    console.log('\n📝 实现要点:');
    console.log('  1. 任务实现 executeStream 方法返回 AsyncGenerator');
    console.log('  2. 工作流返回流式结果而非最终结果');
    console.log('  3. 前端通过 SSE/WebSocket 实时接收数据');
    console.log('  4. 支持进度、数据、错误、完成等不同类型的流式事件');
    console.log('  5. 可以在不中断流式输出的情况下获取最终结果');
  } catch (error) {
    console.error('💥 流式工作流执行异常:', error);
  }
}

// 🚀 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🌊 流式工作流演示 - 专为前端实时显示设计\n');
  runStreamingWorkflowExample().catch(console.error);
}

export {
  runStreamingWorkflowExample,
  SimpleStreamingWorkflow,
  StreamingCodeAnalysisTask,
  StreamingPerformanceTask,
};
