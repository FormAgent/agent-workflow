import { jest } from "@jest/globals";
import { ContextManager } from "../ContextManager";
import {
  type DAG,
  type DAGTask,
  DAGWorkflowEngine,
  type TaskStatus,
} from "../DAG";
import type { TaskInput, TaskOutput } from "../Task";
import { TaskExecutor } from "../TaskExecutor";

describe("错误处理和重试机制", () => {
  let context: ContextManager;
  let executor: TaskExecutor;
  let engine: DAGWorkflowEngine;

  beforeEach(() => {
    context = new ContextManager();
    executor = new TaskExecutor(context);
    engine = new DAGWorkflowEngine(executor);
  });

  test("任务失败时应该触发错误处理", async () => {
    const errorMessage = "Task execution failed";
    const errorHandler = jest.fn();

    class FailingTask implements DAGTask {
      name = "FailingTask";
      async execute(input: TaskInput): Promise<TaskOutput> {
        throw new Error(errorMessage);
      }
      async onError(error: Error, context: ContextManager): Promise<void> {
        errorHandler(error.message);
      }
    }

    const task = new FailingTask();
    const dag: DAG = { tasks: [task] };
    engine.on("taskStatusChanged", (_task: DAGTask, status: TaskStatus) => {
      console.log("taskStatusChanged", _task, status);
      expect(_task).toBe(task);
      // expect(status).toBe('failed');
    });
    await expect(engine.run(dag)).rejects.toThrow(errorMessage);
    expect(errorHandler).toHaveBeenCalledWith(errorMessage);
    expect(engine.getTaskStatus(task)).toBe("failed");
  });

  test("任务应该按照指定次数重试", async () => {
    const executeMock = jest.fn();
    let attempts = 0;

    class RetryableTask implements DAGTask {
      name = "RetryableTask";
      retryCount = 3;

      async execute(input: TaskInput) {
        executeMock();
        attempts++;
        if (attempts < this.retryCount) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return input;
      }
    }

    const task = new RetryableTask();
    const dag: DAG = { tasks: [task] };

    await engine.run(dag);

    expect(executeMock).toHaveBeenCalledTimes(3);
    expect(engine.getTaskStatus(task)).toBe("completed");
  });

  test("超过最大重试次数后应该失败", async () => {
    const executeMock = jest.fn();
    const errorHandler = jest.fn();

    class ExhaustedRetryTask implements DAGTask {
      name = "ExhaustedRetryTask";
      retryCount = 2;

      async execute(input: TaskInput): Promise<TaskOutput> {
        executeMock();
        throw new Error("Persistent failure");
      }

      async onError(error: Error, context: ContextManager) {
        errorHandler(error.message);
      }
    }

    const task = new ExhaustedRetryTask();
    const dag: DAG = { tasks: [task] };

    await expect(engine.run(dag)).rejects.toThrow("Persistent failure");
    expect(executeMock).toHaveBeenCalledTimes(2);
    expect(errorHandler).toHaveBeenCalledWith("Persistent failure");
    expect(engine.getTaskStatus(task)).toBe("failed");
  });

  test("依赖任务失败时应该停止执行", async () => {
    const taskBExecute = jest.fn();

    class FailingTaskA implements DAGTask {
      name = "FailingTaskA";
      async execute(input: TaskInput): Promise<TaskOutput> {
        throw new Error("TaskA failed");
      }
    }

    class TaskB implements DAGTask {
      name = "TaskB";
      dependsOn: DAGTask[] = [];
      async execute(input: TaskInput) {
        taskBExecute();
        return input;
      }
    }

    const taskA = new FailingTaskA();
    const taskB = new TaskB();
    taskB.dependsOn = [taskA];
    const dag: DAG = { tasks: [taskA, taskB] };

    await expect(engine.run(dag)).rejects.toThrow("TaskA failed");
    expect(taskBExecute).not.toHaveBeenCalled();
    expect(engine.getTaskStatus(taskA)).toBe("failed");
    expect(engine.getTaskStatus(taskB)).toBe("pending");
  });

  test("条件分支中的任务失败应该正确处理", async () => {
    const errorHandler = jest.fn();

    class ConditionalTask implements DAGTask {
      name = "ConditionalTask";
      branches: {
        condition: (ctx: ContextManager) => boolean;
        next: DAGTask | DAGTask[];
      }[] = [];

      async execute(input: TaskInput): Promise<TaskOutput> {
        return input;
      }
    }

    class FailingBranchTask implements DAGTask {
      name = "FailingBranchTask";
      async execute(input: TaskInput): Promise<TaskOutput> {
        throw new Error("Branch task failed");
      }
      async onError(error: Error, context: ContextManager): Promise<void> {
        errorHandler(error.message);
      }
    }
    const failingBranchTask = new FailingBranchTask();
    const conditionalTask = new ConditionalTask();
    conditionalTask.branches = [
      {
        condition: () => true,
        next: failingBranchTask,
      },
    ];
    const dag: DAG = { tasks: [failingBranchTask, conditionalTask] };

    await expect(engine.run(dag)).rejects.toThrow("Branch task failed");
    expect(errorHandler).toHaveBeenCalledWith("Branch task failed");
  });
});
