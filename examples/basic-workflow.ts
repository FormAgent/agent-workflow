#!/usr/bin/env tsx

import type { TaskInput } from "../src/workflow/Task";
import { DAGTask, WorkflowBuilder } from "../src/workflow/WorkflowBuilder";

/**
 * 🚀 基础工作流示例
 *
 * 本示例展示：
 * 1. 如何定义简单任务
 * 2. 如何设置任务依赖关系
 * 3. 如何执行工作流并获取结果
 */

// 📝 定义数据处理任务
class DataFetchTask extends DAGTask {
  name = "dataFetch";

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log("🔄 正在获取数据...");

    // 模拟数据获取
    await new Promise((resolve) => setTimeout(resolve, 500));

    const rawData = [
      { id: 1, name: "Alice", age: 25, department: "Engineering" },
      { id: 2, name: "Bob", age: 30, department: "Marketing" },
      { id: 3, name: "Charlie", age: 35, department: "Engineering" },
      { id: 4, name: "Diana", age: 28, department: "Design" },
    ];

    console.log("✅ 数据获取完成");
    return { ...input, rawData };
  }
}

// 🔍 数据验证任务
class DataValidationTask extends DAGTask {
  name = "dataValidation";

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log("🔍 正在验证数据...");

    const rawData = input.rawData as any[];
    if (!rawData || !Array.isArray(rawData)) {
      throw new Error("无效的数据格式");
    }

    // 数据验证逻辑
    const validData = rawData.filter(
      (item) => item.id && item.name && item.age > 0,
    );

    const validationReport = {
      total: rawData.length,
      valid: validData.length,
      invalid: rawData.length - validData.length,
      validationRate:
        ((validData.length / rawData.length) * 100).toFixed(2) + "%",
    };

    console.log("✅ 数据验证完成:", validationReport);
    return { ...input, validData, validationReport };
  }
}

// 📊 数据分析任务
class DataAnalysisTask extends DAGTask {
  name = "dataAnalysis";

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log("📊 正在分析数据...");

    const validData = input.validData as any[];

    // 部门统计
    const departmentStats = validData.reduce(
      (acc, person) => {
        acc[person.department] = (acc[person.department] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 年龄统计
    const ages = validData.map((p) => p.age);
    const ageStats = {
      average: (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1),
      min: Math.min(...ages),
      max: Math.max(...ages),
    };

    const analysisResult = {
      totalEmployees: validData.length,
      departmentDistribution: departmentStats,
      ageStatistics: ageStats,
    };

    console.log("✅ 数据分析完成:", analysisResult);
    return { ...input, analysisResult };
  }
}

// 📋 报告生成任务
class ReportGenerationTask extends DAGTask {
  name = "reportGeneration";

  constructor(dependencies: DAGTask[] = []) {
    super(dependencies);
  }

  async execute(input: TaskInput): Promise<Record<string, any>> {
    console.log("📋 正在生成报告...");

    const { validationReport, analysisResult } = input;

    const report = {
      title: "员工数据分析报告",
      generatedAt: new Date().toISOString(),
      summary: {
        dataQuality: validationReport,
        insights: analysisResult,
      },
      recommendations: [
        "工程部门人员较多，可以考虑进一步细分",
        "员工年龄分布合理，团队年轻化程度适中",
        "数据质量良好，验证通过率达到100%",
      ],
    };

    console.log("✅ 报告生成完成");
    console.log("📄 报告摘要:", JSON.stringify(report.summary, null, 2));

    return { ...input, finalReport: report };
  }
}

// 🎯 主函数 - 运行基础工作流
async function runBasicWorkflow() {
  console.log("🚀 开始运行基础工作流示例\n");

  try {
    // 创建任务实例
    const fetchTask = new DataFetchTask();
    const validationTask = new DataValidationTask([fetchTask]);
    const analysisTask = new DataAnalysisTask([validationTask]);
    const reportTask = new ReportGenerationTask([analysisTask]);

    // 🔥 使用新的WorkflowBuilder - 一行搞定！
    const workflow = WorkflowBuilder.create()
      .addTasks([fetchTask, validationTask, analysisTask, reportTask])
      .build();

    // 执行工作流
    const startTime = Date.now();
    const result = await workflow.execute({
      projectName: "Employee Data Analysis",
      requestedBy: "HR Department",
    });

    const executionTime = Date.now() - startTime;

    // 显示结果
    console.log("\n🎉 工作流执行完成！");
    console.log("=".repeat(50));
    console.log(`✅ 执行状态: ${result.success ? "成功" : "失败"}`);
    console.log(`⏱️  总执行时间: ${result.executionTime}ms`);
    console.log(`📊 实际执行时间: ${executionTime}ms`);
    console.log(`🔢 执行任务数: ${result.taskResults.size}`);

    if (result.success) {
      console.log("\n📋 最终报告标题:", result.data?.finalReport?.title);
      console.log(
        "🎯 推荐建议数量:",
        result.data?.finalReport?.recommendations?.length,
      );
    } else {
      console.error("❌ 执行失败:", result.error?.message);
    }

    // 显示各任务执行详情
    console.log("\n📈 任务执行详情:");
    result.taskResults.forEach((taskResult, taskName) => {
      const status = taskResult.status === "completed" ? "✅" : "❌";
      console.log(
        `${status} ${taskName}: ${taskResult.status} (${taskResult.duration}ms)`,
      );
    });
  } catch (error) {
    console.error("💥 工作流执行异常:", error);
  }
}

// 🚀 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  runBasicWorkflow().catch(console.error);
}

export { runBasicWorkflow };
