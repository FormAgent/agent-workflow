import { ContextManager } from "../ContextManager";
import { type DAG, type DAGTask, DAGWorkflowEngine } from "../DAG";
import type { TaskInput, TaskOutput } from "../Task";
import { TaskExecutor } from "../TaskExecutor";

class TaskA implements DAGTask {
  name = "TaskA";
  dependsOn = Array<DAGTask>();
  async execute(input: TaskInput) {
    const executionOrder = input.executionOrder ?? [];
    executionOrder.push(this);
    return { ...input, executionOrder };
  }
}

class TaskB implements DAGTask {
  name = "TaskB";
  dependsOn = Array<DAGTask>();
  async execute(input: TaskInput) {
    const executionOrder = input.executionOrder ?? [];
    executionOrder.push(this);
    return { ...input, executionOrder };
  }
}

class TaskC implements DAGTask {
  name = "TaskC";
  dependsOn = Array<DAGTask>();
  async execute(input: TaskInput) {
    const executionOrder = input.executionOrder ?? [];
    executionOrder.push(this);
    return { ...input, executionOrder };
  }
}

class ConditionalTask implements DAGTask {
  name = "ConditionalTask";
  dependsOn = Array<DAGTask>();
  branches: {
    condition: (ctx: ContextManager) => boolean;
    next: DAGTask | DAGTask[];
  }[] = [];
  defaultNext: DAGTask | DAGTask[] = [];
  async execute(input: TaskInput) {
    const executionOrder = input.executionOrder ?? [];
    executionOrder.push(this);
    return { ...input, executionOrder };
  }
}

describe("条件分支DAG任务调度", () => {
  let context: ContextManager;
  let executor: TaskExecutor;
  let engine: DAGWorkflowEngine;

  beforeEach(() => {
    context = new ContextManager();
    executor = new TaskExecutor(context);
    engine = new DAGWorkflowEngine(executor);
  });

  test("条件分支执行 - 当条件为真时应该执行TaskB", async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const conditionalTask = new ConditionalTask();
    conditionalTask.branches = [
      { condition: (ctx: ContextManager) => ctx.get("value") > 5, next: taskB },
      {
        condition: (ctx: ContextManager) => ctx.get("value") <= 5,
        next: taskC,
      },
    ];
    taskB.dependsOn = [conditionalTask];
    taskC.dependsOn = [conditionalTask];

    const dag: DAG = {
      tasks: [taskA, conditionalTask, taskB, taskC],
    };

    context.set("value", 10);
    context.set("executionOrder", []);
    // 运行工作流
    await engine.run(dag);

    // 验证执行顺序
    expect(context.get("executionOrder")).toEqual([
      taskA,
      conditionalTask,
      taskB,
    ]);
    // 验证TaskC没有被执行
    expect(context.get("executionOrder")).not.toContain(taskC);
  });

  test("条件分支执行 - 当条件为假时应该执行TaskC", async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const conditionalTask = new ConditionalTask();
    conditionalTask.branches = [
      { condition: (ctx: ContextManager) => ctx.get("value") > 5, next: taskB },
      {
        condition: (ctx: ContextManager) => ctx.get("value") <= 5,
        next: taskC,
      },
    ];
    taskB.dependsOn = [conditionalTask];
    taskC.dependsOn = [conditionalTask];

    const dag: DAG = {
      tasks: [taskA, conditionalTask, taskB, taskC],
    };

    // 运行工作流
    await engine.run(dag);

    context.set("value", 5);
    context.set("executionOrder", []);
    // 运行工作流
    await engine.run(dag);
    // 验证执行顺序
    expect(context.get("executionOrder")).toEqual([
      taskA,
      conditionalTask,
      taskC,
    ]);
    // 验证TaskB没有被执行
    expect(context.get("executionOrder")).not.toContain(taskB);
  });

  test("条件分支执行 - 使用默认分支", async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const conditionalTask = new ConditionalTask();
    conditionalTask.branches = [
      {
        condition: (ctx: ContextManager) => ctx.get("value") <= 5,
        next: taskC,
      },
    ];
    conditionalTask.defaultNext = taskB;

    taskB.dependsOn = [conditionalTask];
    taskC.dependsOn = [conditionalTask];

    const dag: DAG = {
      tasks: [taskA, conditionalTask, taskB, taskC],
    };

    context.set("value", 10);
    context.set("executionOrder", []);
    // 运行工作流
    await engine.run(dag);

    // 验证执行顺序
    expect(context.get("executionOrder")).toEqual([
      taskA,
      conditionalTask,
      taskB,
    ]);
    // 验证TaskB没有被执行
    expect(context.get("executionOrder")).not.toContain(taskC);
  });

  test("多层条件分支 - 嵌套条件分支执行", async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const conditionalTask1 = new ConditionalTask();
    const conditionalTask2 = new ConditionalTask();

    // 第一层条件分支
    conditionalTask1.branches = [
      {
        condition: (ctx: ContextManager) => ctx.get("value") > 5,
        next: conditionalTask2,
      },
      {
        condition: (ctx: ContextManager) => ctx.get("value") <= 5,
        next: taskC,
      },
    ];

    // 第二层条件分支
    conditionalTask2.branches = [
      {
        condition: (ctx: ContextManager) => ctx.get("type") === "B",
        next: taskB,
      },
    ];
    conditionalTask2.defaultNext = taskC;

    conditionalTask1.dependsOn = [taskA];
    conditionalTask2.dependsOn = [conditionalTask1];
    taskB.dependsOn = [conditionalTask2];
    taskC.dependsOn = [conditionalTask2];

    const dag: DAG = {
      tasks: [taskA, conditionalTask1, conditionalTask2, taskB, taskC],
    };

    context.set("value", 10);
    context.set("type", "B");
    context.set("executionOrder", []);

    await engine.run(dag);

    expect(context.get("executionOrder")).toEqual([
      taskA,
      conditionalTask1,
      conditionalTask2,
      taskB,
    ]);
    expect(context.get("executionOrder")).not.toContain(taskC);
  });

  test("并行条件分支 - 多个条件分支同时执行", async () => {
    class TaskD implements DAGTask {
      name = "TaskD";
      dependsOn = Array<DAGTask>();
      async execute(input: TaskInput) {
        const executionOrder = input.executionOrder ?? [];
        executionOrder.push(this);
        return { ...input, executionOrder };
      }
    }

    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const taskD = new TaskD();
    const conditionalTask = new ConditionalTask();

    conditionalTask.branches = [
      {
        condition: (ctx: ContextManager) => ctx.get("value") > 5,
        next: [taskB, taskC], // 同时执行B和C
      },
      {
        condition: (ctx: ContextManager) => ctx.get("value") <= 5,
        next: [taskC, taskD], // 同时执行C和D
      },
    ];

    taskB.dependsOn = [conditionalTask];
    taskC.dependsOn = [conditionalTask];
    taskD.dependsOn = [conditionalTask];

    const dag: DAG = {
      tasks: [taskA, conditionalTask, taskB, taskC, taskD],
    };

    context.set("value", 10);
    context.set("executionOrder", []);

    await engine.run(dag);

    const executionOrder = context.get("executionOrder");
    expect(executionOrder).toContain(taskA);
    expect(executionOrder).toContain(conditionalTask);
    expect(executionOrder).toContain(taskB);
    expect(executionOrder).toContain(taskC);
    expect(executionOrder).not.toContain(taskD);
  });

  test("条件分支 - 动态条件判断", async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const conditionalTask = new ConditionalTask();

    // TaskA会设置一个值，conditionalTask基于这个值做判断
    class DynamicTaskA implements DAGTask {
      name = "DynamicTaskA";
      dependsOn = Array<DAGTask>();
      async execute(input: TaskInput) {
        const executionOrder = input.executionOrder ?? [];
        executionOrder.push(this);
        return {
          ...input,
          executionOrder,
          dynamicValue: input.initialValue * 2, // 动态计算值
        };
      }
    }

    const dynamicTaskA = new DynamicTaskA();
    conditionalTask.branches = [
      {
        condition: (ctx: ContextManager) => ctx.get("dynamicValue") > 10,
        next: taskB,
      },
      {
        condition: (ctx: ContextManager) => ctx.get("dynamicValue") <= 10,
        next: taskC,
      },
    ];

    taskB.dependsOn = [conditionalTask];
    taskC.dependsOn = [conditionalTask];
    conditionalTask.dependsOn = [dynamicTaskA];

    const dag: DAG = {
      tasks: [dynamicTaskA, conditionalTask, taskB, taskC],
    };

    // 测试动态条件分支 - 应该执行taskB
    context.set("initialValue", 6);
    context.set("executionOrder", []);
    await engine.run(dag);
    expect(context.get("executionOrder")).toEqual([
      dynamicTaskA,
      conditionalTask,
      taskB,
    ]);

    // 测试动态条件分支 - 应该执行taskC
    context.set("initialValue", 4);
    context.set("executionOrder", []);
    await engine.run(dag);
    expect(context.get("executionOrder")).toEqual([
      dynamicTaskA,
      conditionalTask,
      taskC,
    ]);
  });

  test("错误处理 - 条件分支执行失败", async () => {
    class FailingTask implements DAGTask {
      name = "FailingTask";
      dependsOn: DAGTask[] = [];
      async execute(input: TaskInput): Promise<TaskOutput> {
        throw new Error("Task execution failed");
      }
    }

    const taskA = new TaskA();
    const failingTask = new FailingTask();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const conditionalTask = new ConditionalTask();

    conditionalTask.branches = [
      {
        condition: (ctx: ContextManager) => ctx.get("value") > 5,
        next: failingTask,
      },
      {
        condition: (ctx: ContextManager) => ctx.get("value") <= 5,
        next: taskC,
      },
    ];

    failingTask.dependsOn = [conditionalTask];
    taskC.dependsOn = [conditionalTask];

    const dag: DAG = {
      tasks: [taskA, conditionalTask, failingTask, taskC],
    };

    context.set("value", 10);
    context.set("executionOrder", []);

    await expect(engine.run(dag)).rejects.toThrow("Task execution failed");
  });

  test("多层条件分支 - 提前终止未选中分支", async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const conditionalTask = new ConditionalTask();

    class TaskD implements DAGTask {
      name = "TaskD";
      dependsOn = [taskB]; // D依赖B
      async execute(input: TaskInput) {
        const executionOrder = input.executionOrder ?? [];
        executionOrder.push(this);
        return { ...input, executionOrder };
      }
    }

    const taskD = new TaskD();

    // A的条件分支决定执行B或C
    conditionalTask.dependsOn = [taskA];
    conditionalTask.branches = [
      {
        condition: (ctx: ContextManager) => ctx.get("value") > 5,
        next: taskB, // 如果选择B，理论上D应该执行
      },
      {
        condition: (ctx: ContextManager) => ctx.get("value") <= 5,
        next: taskC, // 如果选择C，D不应该执行
      },
    ];

    taskB.dependsOn = [conditionalTask];
    taskC.dependsOn = [conditionalTask];

    const dag: DAG = {
      tasks: [taskA, conditionalTask, taskB, taskC, taskD],
    };

    // 测试选择C分支的情况
    context.set("value", 5);
    context.set("executionOrder", []);
    await engine.run(dag);

    // 验证执行顺序：只有A、conditionalTask和C被执行
    expect(context.get("executionOrder")).toEqual([
      taskA,
      conditionalTask,
      taskC,
    ]);

    // 验证B和D都没有被执行
    expect(context.get("executionOrder")).not.toContain(taskB);
    expect(context.get("executionOrder")).not.toContain(taskD);

    // 测试选择B分支的情况
    context.set("value", 10);
    context.set("executionOrder", []);
    await engine.run(dag);

    // 验证执行顺序：A、conditionalTask、B和D都被执行
    expect(context.get("executionOrder")).toEqual([
      taskA,
      conditionalTask,
      taskB,
      taskD,
    ]);

    // 验证C没有被执行
    expect(context.get("executionOrder")).not.toContain(taskC);
  });

  test("多条件分支 - 只执行第一个满足的条件及其依赖链", async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const conditionalTask = new ConditionalTask();

    // 创建B和C的后续任务
    class TaskB2 implements DAGTask {
      name = "TaskB2";
      dependsOn = [taskB];
      async execute(input: TaskInput) {
        const executionOrder = input.executionOrder ?? [];
        executionOrder.push(this);
        return { ...input, executionOrder };
      }
    }

    class TaskC2 implements DAGTask {
      name = "TaskC2";
      dependsOn = [taskC];
      async execute(input: TaskInput) {
        const executionOrder = input.executionOrder ?? [];
        executionOrder.push(this);
        return { ...input, executionOrder };
      }
    }

    const taskB2 = new TaskB2();
    const taskC2 = new TaskC2();

    // 设置多个可能同时满足的条件
    conditionalTask.branches = [
      {
        condition: (ctx: ContextManager) => ctx.get("value") > 5,
        next: taskB,
      },
      {
        condition: (ctx: ContextManager) => ctx.get("value") > 3,
        next: taskC,
      },
    ];

    taskB.dependsOn = [conditionalTask];
    taskC.dependsOn = [conditionalTask];
    conditionalTask.dependsOn = [taskA];

    const dag: DAG = {
      tasks: [taskA, conditionalTask, taskB, taskC, taskB2, taskC2],
    };

    // 设置一个会满足多个条件的值
    context.set("value", 10);
    context.set("executionOrder", []);
    await engine.run(dag);

    // 验证执行顺序：第一个分支(B)及其依赖链被执行
    expect(context.get("executionOrder")).toEqual([
      taskA,
      conditionalTask,
      taskB,
      taskB2,
    ]);

    // 验证第二个分支的任务链(C和C2)都没有被执行
    expect(context.get("executionOrder")).not.toContain(taskC);
    expect(context.get("executionOrder")).not.toContain(taskC2);

    // 再次验证，使用一个只满足第二个条件的值
    context.set("value", 4);
    context.set("executionOrder", []);
    await engine.run(dag);

    // 这时应该执行C分支的任务链
    expect(context.get("executionOrder")).toEqual([
      taskA,
      conditionalTask,
      taskC,
      taskC2,
    ]);

    // 验证B分支的任务链都没有被执行
    expect(context.get("executionOrder")).not.toContain(taskB);
    expect(context.get("executionOrder")).not.toContain(taskB2);
  });
});
