#!/usr/bin/env tsx

import type { TaskInput } from "../src/workflow/Task";
import { type DAGTask, WorkflowBuilder } from "../src/workflow/WorkflowBuilder";

/**
 * 🤖 简化Agent风格API - 类似OpenAI Agent SDK
 *
 * 本示例展示：
 * 1. 简洁的Agent定义方式
 * 2. 类似OpenAI Agent SDK的Runner.run_sync用法
 * 3. Agent间的协作和handoff机制
 * 4. 工具函数的装饰器风格定义
 */

// 🛠️ 工具函数定义（类似@function_tool装饰器）
function functionTool<T extends (...args: any[]) => any>(fn: T): T {
  (fn as any).isTool = true;
  return fn;
}

// 定义工具函数
const submitRefundRequest = functionTool((itemId: string, reason: string) => {
  console.log(`📝 处理退款请求: 商品ID=${itemId}, 原因=${reason}`);
  return { status: "success", refundId: `RF-${Date.now()}` };
});

const webSearch = functionTool((query: string) => {
  console.log(`🔍 网络搜索: ${query}`);
  // 模拟搜索结果
  return {
    results: [
      {
        title: "最佳运动鞋推荐 2024",
        url: "example.com/shoes",
        snippet: "专业运动鞋评测...",
      },
      {
        title: "时尚搭配指南",
        url: "example.com/style",
        snippet: "服装搭配技巧...",
      },
    ],
  };
});

const analyzeOutfit = functionTool((description: string) => {
  console.log(`👗 分析服装搭配: ${description}`);
  return {
    style: "casual-smart",
    colors: ["navy", "white", "brown"],
    suggestions: ["添加一双棕色皮鞋会很好搭配"],
  };
});

// 🤖 Agent类定义
class Agent {
  constructor(
    public name: string,
    public instructions: string,
    public tools: Function[] = [],
    public handoffs: Agent[] = [],
  ) {}

  // 转换为WorkflowBuilder任务
  toTask(): DAGTask {
    const agent = this;

    return {
      name: this.name.replace(/\s+/g, ""),
      dependsOn: [],
      async execute(input: TaskInput): Promise<Record<string, any>> {
        console.log(`\n🤖 Agent [${agent.name}] 开始处理请求`);
        console.log(`📋 指令: ${agent.instructions}`);

        const userQuery = input.userQuery || input.query || "";
        console.log(`💭 用户查询: ${userQuery}`);

        // 模拟Agent思考过程
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 决定使用哪个工具或转交给哪个Agent
        let result: any = { agentName: agent.name };

        if (agent.name === "Triage Agent") {
          // 分流逻辑
          if (
            userQuery.toLowerCase().includes("shoes") ||
            userQuery.toLowerCase().includes("outfit")
          ) {
            result.handoff = "Shopping Assistant";
            result.reason = "用户询问关于服装搭配，转交给购物助手";
          } else if (
            userQuery.toLowerCase().includes("refund") ||
            userQuery.toLowerCase().includes("return")
          ) {
            result.handoff = "Support & Returns";
            result.reason = "用户询问退款事宜，转交给客服";
          } else {
            result.handoff = "Shopping Assistant";
            result.reason = "默认转交给购物助手";
          }
        } else if (agent.name === "Shopping Assistant") {
          // 购物助手逻辑
          const outfitAnalysis = analyzeOutfit(userQuery);
          const searchResults = webSearch("鞋子推荐 " + outfitAnalysis.style);

          result = {
            ...result,
            outfitAnalysis,
            searchResults,
            recommendation: "基于您的搭配，建议选择棕色或深蓝色的休闲皮鞋",
            suggestedProducts: [
              { name: "Clarks沙漠靴", price: "$120", match: "95%" },
              { name: "Cole Haan休闲鞋", price: "$150", match: "90%" },
            ],
          };
        } else if (agent.name === "Support & Returns") {
          // 客服逻辑
          if (userQuery.toLowerCase().includes("refund")) {
            const refundResult = submitRefundRequest(
              "ITEM-123",
              "不满意商品质量",
            );
            result = {
              ...result,
              action: "refund_processed",
              refundDetails: refundResult,
              message: "退款请求已提交，预计3-5个工作日处理完成",
            };
          } else {
            result.message = "请提供更多详细信息以便我们为您提供帮助";
          }
        }

        console.log(`✅ Agent [${agent.name}] 处理完成`);
        return { ...input, [agent.name.replace(/\s+/g, "")]: result };
      },
    };
  }
}

// 🏃‍♂️ Runner类 - 简化的执行器
class Runner {
  static async runSync(options: {
    startingAgent: Agent;
    input: string;
    maxHops?: number;
  }): Promise<any> {
    const { startingAgent, input, maxHops = 5 } = options;

    console.log("🚀 Runner 开始执行工作流");
    console.log(`🎯 起始Agent: ${startingAgent.name}`);
    console.log(`📝 用户输入: ${input}`);

    // 收集所有相关Agent
    const allAgents = new Set<Agent>();
    const collectAgents = (agent: Agent) => {
      allAgents.add(agent);
      agent.handoffs.forEach(collectAgents);
    };
    collectAgents(startingAgent);

    // 构建工作流
    const workflow = WorkflowBuilder.create();

    // 添加所有Agent作为任务
    Array.from(allAgents).forEach((agent) => {
      workflow.addTask(agent.toTask());
    });

    // 添加智能路由策略
    workflow.addDynamicStrategy({
      name: "agent_handoff_routing",
      condition: (context) => {
        // 检查是否有Agent建议转交
        const triageResult = context.get("TriageAgent") as any;
        return triageResult?.handoff;
      },
      generator: async (context) => {
        const triageResult = context.get("TriageAgent") as any;
        const targetAgentName = triageResult?.handoff;

        console.log(`🔄 Agent转交: ${triageResult?.reason}`);
        console.log(`➡️  转交给: ${targetAgentName}`);

        // 返回空数组，因为目标Agent已经在静态任务中
        return [];
      },
      priority: 10,
    });

    // 执行工作流
    const result = await workflow.build().execute({
      userQuery: input,
      query: input,
    });

    if (result.success) {
      console.log("\n🎉 工作流执行成功！");
      console.log("📊 执行统计:");
      console.log(`   - 总执行时间: ${result.executionTime}ms`);
      console.log(`   - 任务数量: ${result.taskResults.size}`);
      console.log(`   - 动态任务: ${result.dynamicTasksGenerated || 0}`);

      // 提取最终结果
      const triageResult = result.data?.TriageAgent;
      const targetAgent = triageResult?.handoff?.replace(/\s+/g, "");

      if (targetAgent && result.data?.[targetAgent]) {
        console.log(`\n📋 最终结果来自 [${triageResult.handoff}]:`);
        return result.data[targetAgent];
      } else {
        return result.data;
      }
    } else {
      console.error("❌ 工作流执行失败:", result.error?.message);
      throw result.error;
    }
  }
}

// 🎯 Agent定义 - 完全模仿OpenAI Agent SDK的风格
const supportAgent = new Agent(
  "Support & Returns",
  "You are a support agent who can submit refunds and handle customer service issues.",
  [submitRefundRequest],
);

const shoppingAgent = new Agent(
  "Shopping Assistant",
  "You are a shopping assistant who can search the web for products and analyze outfit compatibility.",
  [webSearch, analyzeOutfit],
);

const triageAgent = new Agent(
  "Triage Agent",
  "Route the user to the correct agent based on their query. Analyze the intent and decide which specialist can best help.",
  [],
  [shoppingAgent, supportAgent], // handoffs
);

// 🚀 主函数 - 展示简化的使用方式
async function runSimpleAgentExample() {
  console.log("🤖 简化Agent风格API示例\n");

  try {
    // 测试1: 服装搭配查询
    console.log("=".repeat(60));
    console.log("🧪 测试1: 服装搭配查询");

    const output1 = await Runner.runSync({
      startingAgent: triageAgent,
      input:
        "What shoes might work best with my navy blazer and white shirt outfit?",
    });

    console.log("\n📋 最终结果:");
    console.log(JSON.stringify(output1, null, 2));

    // 测试2: 退款申请
    console.log("\n" + "=".repeat(60));
    console.log("🧪 测试2: 退款申请");

    const output2 = await Runner.runSync({
      startingAgent: triageAgent,
      input: "I want to request a refund for my recent purchase",
    });

    console.log("\n📋 最终结果:");
    console.log(JSON.stringify(output2, null, 2));

    // 展示API对比
    console.log("\n" + "=".repeat(60));
    console.log("📊 API对比展示:");
    console.log(`
    // OpenAI Agent SDK 风格:
    output = Runner.run_sync(
        starting_agent=triage_agent,
        input="What shoes might work best with my outfit?"
    )
    
    // 我们的实现 (几乎完全一致):
    const output = await Runner.runSync({
        startingAgent: triageAgent,
        input: "What shoes might work best with my outfit?"
    });
    
    🎯 核心优势:
    ✅ API简洁性: 与OpenAI Agent SDK几乎一致
    ✅ 更强大: 支持复杂的工作流和动态策略
    ✅ 类型安全: 完整的TypeScript支持
    ✅ 灵活性: 可以扩展为复杂的多步骤工作流
    ✅ 性能: 自动并行执行和优化
    `);
  } catch (error) {
    console.error("💥 执行异常:", error);
  }
}

// 🚀 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🎯 本示例演示如何用简洁的API创建类似OpenAI Agent SDK的功能\n");
  runSimpleAgentExample().catch(console.error);
}

export { Agent, Runner, functionTool, runSimpleAgentExample };
