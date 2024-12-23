import { jest } from "@jest/globals";
import { ContextManager } from "../ContextManager";
import { DAGWorkflowEngine } from "../DAG";
import type { DAGTask, TaskStatus } from "../DAG";
import type { Task, TaskInput } from "../Task";
import { TaskExecutor } from "../TaskExecutor";

describe("DAGWorkflowEngine Task Status Events", () => {
  let engine: DAGWorkflowEngine;
  let executor: TaskExecutor;
  let statusChanges: Array<{ task: DAGTask; status: TaskStatus }>;
  let context: ContextManager;

  beforeEach(() => {
    context = new ContextManager();
    executor = new TaskExecutor(context);
    engine = new DAGWorkflowEngine(executor);
    statusChanges = [];
    context.set("executionOrder", []);

    engine.on("taskStatusChanged", (task: DAGTask, status: TaskStatus) => {
      statusChanges.push({ task, status });
    });
  });

  it("should handle execution order with sequential tasks", async () => {
    class SequentialTaskA implements DAGTask {
      name = "SequentialTaskA";
      dependsOn = Array<DAGTask>();
      async execute(input: TaskInput) {
        const executionOrder = input.executionOrder ?? [];
        executionOrder.push(this);
        return { ...input, executionOrder, value: 1 };
      }
    }

    class SequentialTaskB implements DAGTask {
      name = "SequentialTaskB";
      dependsOn = Array<DAGTask>();
      async execute(input: TaskInput) {
        const executionOrder = input.executionOrder ?? [];
        executionOrder.push(this);
        return { ...input, executionOrder, value: input.value + 1 };
      }
    }

    const taskA = new SequentialTaskA();
    const taskB = new SequentialTaskB();
    taskB.dependsOn = [taskA];

    const dag = { tasks: [taskA, taskB] };
    await engine.run(dag);

    expect(statusChanges).toHaveLength(4);
    expect(statusChanges).toEqual([
      { task: taskA, status: "running" },
      { task: taskA, status: "completed" },
      { task: taskB, status: "running" },
      { task: taskB, status: "completed" },
    ]);
    expect(context.get("executionOrder")).toEqual([taskA, taskB]);
  });

  it("should handle parallel task execution", async () => {
    class ParallelTask implements DAGTask {
      constructor(public name: string) {}
      dependsOn = Array<DAGTask>();
      async execute(input: TaskInput) {
        const executionOrder = input.executionOrder ?? [];
        executionOrder.push(this);
        return { ...input, executionOrder };
      }
    }

    const rootTask = new ParallelTask("Root");
    const parallelTask1 = new ParallelTask("Parallel1");
    const parallelTask2 = new ParallelTask("Parallel2");
    const finalTask = new ParallelTask("Final");

    parallelTask1.dependsOn = [rootTask];
    parallelTask2.dependsOn = [rootTask];
    finalTask.dependsOn = [parallelTask1, parallelTask2];

    const dag = { tasks: [rootTask, parallelTask1, parallelTask2, finalTask] };
    await engine.run(dag);

    expect(statusChanges).toHaveLength(8);
    const executionOrder = context.get("executionOrder");

    // 验证执行顺序
    expect(executionOrder[0]).toBe(rootTask);
    expect(executionOrder[executionOrder.length - 1]).toBe(finalTask);
    expect(executionOrder).toContain(parallelTask1);
    expect(executionOrder).toContain(parallelTask2);
  });

  it("should handle task with multiple dependencies", async () => {
    class MultiDependencyTask implements DAGTask {
      constructor(
        public name: string,
        public value: number,
      ) {}
      dependsOn = Array<DAGTask>();
      async execute(input: TaskInput) {
        const executionOrder = input.executionOrder ?? [];
        executionOrder.push(this);
        context.set("sum", (context.get("sum") ?? 0) + this.value);
        return { ...input, executionOrder };
      }
    }

    const task1 = new MultiDependencyTask("Task1", 1);
    const task2 = new MultiDependencyTask("Task2", 2);
    const task3 = new MultiDependencyTask("Task3", 3);
    const finalTask = new MultiDependencyTask("FinalTask", 4);

    finalTask.dependsOn = [task1, task2, task3];

    const dag = { tasks: [task1, task2, task3, finalTask] };
    await engine.run(dag);

    expect(statusChanges).toHaveLength(8); // 4 tasks * 2 status changes each
    expect(context.get("sum")).toBe(10); // 1 + 2 + 3 + 4
  });

  it("should handle error propagation in task chain", async () => {
    class ChainTask implements DAGTask {
      constructor(
        public name: string,
        public shouldFail = false,
      ) {}
      dependsOn = Array<DAGTask>();
      async execute(input: TaskInput) {
        if (this.shouldFail) {
          throw new Error(`${this.name} failed`);
        }
        const executionOrder = input.executionOrder ?? [];
        executionOrder.push(this);
        return { ...input, executionOrder };
      }
    }

    const task1 = new ChainTask("Task1");
    const task2 = new ChainTask("Task2", true); // This task will fail
    const task3 = new ChainTask("Task3");

    task2.dependsOn = [task1];
    task3.dependsOn = [task2];

    const dag = { tasks: [task1, task2, task3] };

    await expect(engine.run(dag)).rejects.toThrow("Task2 failed");

    expect(statusChanges).toContainEqual({ task: task1, status: "completed" });
    expect(statusChanges).toContainEqual({ task: task2, status: "failed" });
    expect(statusChanges).not.toContainEqual({
      task: task3,
      status: "running",
    });
  });

  it("should handle empty task list", async () => {
    const dag = { tasks: [] };
    await engine.run(dag);
    expect(statusChanges).toHaveLength(0);
  });
});
