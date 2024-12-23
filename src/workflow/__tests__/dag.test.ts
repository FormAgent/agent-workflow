import type { DAG } from '../DAG';
import { DAGParser } from '../DAG';
import type { TaskInput, TaskOutput } from '../Task';
import { TaskA, TaskB, TaskC, TaskD } from './dagTasks';
const execute = async (input: TaskInput): Promise<TaskOutput> => {
  return {};
};

describe('一般的DAG任务调度', () => {
  beforeEach(() => {});

  test('三层任务依赖，在2级有两个任务可以并行', async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const taskD = new TaskD();

    taskB.dependsOn = [taskA];
    taskC.dependsOn = [taskB];
    taskD.dependsOn = [taskA];

    const dag1: DAG = {
      tasks: [
        taskA,
        taskB,
        taskC,
        taskD,
      ],
    };
    const resposne = DAGParser.getExecutionOrderWithLevels(dag1);
    console.log(resposne); 
    expect(resposne.length).toBe(3);
    expect(resposne[0].level).toBe(0);
    expect(resposne[0].tasks).toEqual([taskA]);
    expect(resposne[1].level).toBe(1);
    expect(resposne[1].tasks).toEqual([taskB, taskD]);
    expect(resposne[2].level).toBe(2);
    expect(resposne[2].tasks).toEqual([taskC]);
  });

  test('三层任务依赖，任务D同时依赖任务B和任务C', async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const taskD = new TaskD();

    taskB.dependsOn = [taskA];
    taskC.dependsOn = [taskA];
    taskD.dependsOn = [taskB, taskC];

    const dag2: DAG = {
      tasks: [
        taskA,
        taskB,
        taskC,
        taskD,
      ],
    };
    const resposne = DAGParser.getExecutionOrderWithLevels(dag2);
    console.log(resposne); 
    expect(resposne.length).toBe(3);
    expect(resposne[0].level).toBe(0);
    expect(resposne[0].tasks).toEqual([taskA]);
    expect(resposne[1].level).toBe(1);
    expect(resposne[1].tasks).toEqual([taskB, taskC]);
    expect(resposne[2].level).toBe(2);
    expect(resposne[2].tasks).toEqual([taskD]);
  });

  test('无依赖任务', async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();

    const dag3: DAG = {
      tasks: [
        taskA,
        taskB,
        taskC,
      ],
    };
    const resposne = DAGParser.getExecutionOrderWithLevels(dag3);
    console.log(resposne); 
    expect(resposne.length).toBe(1);
    expect(resposne[0].level).toBe(0);
    expect(resposne[0].tasks).toEqual([taskA, taskB, taskC]);
  });

  test('循环依赖应该出错', async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();

    taskA.dependsOn = [taskC];
    taskB.dependsOn = [taskA];
    taskC.dependsOn = [taskB];

    const dag4: DAG = {
      tasks: [
        taskA,
        taskB,
        taskC,
      ],
    };
    expect(() => {
    const resposne = DAGParser.getExecutionOrderWithLevels(dag4);
    console.log(resposne); 
    }).toThrow("Cyclic dependency detected in the task graph");
  });

  test('空DAG应该正常处理', async () => {
    const dag: DAG = {
      tasks: [],
    };
    const response = DAGParser.getExecutionOrderWithLevels(dag);
    expect(response.length).toBe(0);
  });

  test('单个任务的DAG', async () => {
    const taskA = new TaskA();
    const dag: DAG = {
      tasks: [taskA],
    };
    const response = DAGParser.getExecutionOrderWithLevels(dag);
    expect(response.length).toBe(1);
    expect(response[0].tasks).toEqual([taskA]);
  });

  test('复杂的菱形依赖', async () => {
    const taskA = new TaskA();
    const taskB1 = new TaskB();
    const taskB2 = new TaskB();
    const taskC1 = new TaskC();
    const taskC2 = new TaskC();
    const taskD = new TaskD();

    // A -> B1 -> C1 -> D
    //   -> B2 -> C2 /
    taskB1.dependsOn = [taskA];
    taskB2.dependsOn = [taskA];
    taskC1.dependsOn = [taskB1];
    taskC2.dependsOn = [taskB2];
    taskD.dependsOn = [taskC1, taskC2];

    const dag: DAG = {
      tasks: [taskA, taskB1, taskB2, taskC1, taskC2, taskD],
    };

    const response = DAGParser.getExecutionOrderWithLevels(dag);
    expect(response.length).toBe(4);
    expect(response[0].tasks).toEqual([taskA]);
    expect(response[1].tasks).toContain(taskB1);
    expect(response[1].tasks).toContain(taskB2);
    expect(response[2].tasks).toContain(taskC1);
    expect(response[2].tasks).toContain(taskC2);
    expect(response[3].tasks).toEqual([taskD]);
  });

  test('自依赖应该被检测为循环依赖', async () => {
    const taskA = new TaskA();
    taskA.dependsOn = [taskA]; // 自依赖

    const dag: DAG = {
      tasks: [taskA],
    };

    expect(() => {
      DAGParser.getExecutionOrderWithLevels(dag);
    }).toThrow('Cyclic dependency detected in the task graph');
  });

  test('长链式依赖', async () => {
    const tasks = Array.from({ length: 10 }, (_, i) => {
      const task = new TaskA();
      task.name = `Task${i}`;
      return task;
    });

    // 创建长链式依赖: 0->1->2->3->...->9
    for (let i = 1; i < tasks.length; i++) {
      tasks[i].dependsOn = [tasks[i - 1]];
    }

    const dag: DAG = {
      tasks: tasks,
    };

    const response = DAGParser.getExecutionOrderWithLevels(dag);
    expect(response.length).toBe(10);
    response.forEach((level, i) => {
      expect(level.tasks[0].name).toBe(`Task${i}`);
    });
  });

  test('多个独立的子图', async () => {
    // 子图1: A1 -> B1 -> C1
    const taskA1 = new TaskA();
    const taskB1 = new TaskB();
    const taskC1 = new TaskC();
    taskA1.name = 'A1';
    taskB1.name = 'B1';
    taskC1.name = 'C1';
    taskB1.dependsOn = [taskA1];
    taskC1.dependsOn = [taskB1];

    // 子图2: A2 -> B2
    const taskA2 = new TaskA();
    const taskB2 = new TaskB();
    taskA2.name = 'A2';
    taskB2.name = 'B2';
    taskB2.dependsOn = [taskA2];

    const dag: DAG = {
      tasks: [taskA1, taskB1, taskC1, taskA2, taskB2],
    };

    const response = DAGParser.getExecutionOrderWithLevels(dag);
    expect(response.length).toBe(3);
    expect(response[0].tasks).toContain(taskA1);
    expect(response[0].tasks).toContain(taskA2);
    expect(response[1].tasks).toContain(taskB1);
    expect(response[1].tasks).toContain(taskB2);
    expect(response[2].tasks).toEqual([taskC1]);
  });

  test('复杂的循环依赖检测', async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();
    const taskD = new TaskD();

    // 创建复杂的循环依赖: A -> B -> C -> D -> B
    taskB.dependsOn = [taskA];
    taskC.dependsOn = [taskB];
    taskD.dependsOn = [taskC];
    taskB.dependsOn = [...(taskB.dependsOn || []), taskD];

    const dag: DAG = {
      tasks: [taskA, taskB, taskC, taskD],
    };

    expect(() => {
      DAGParser.getExecutionOrderWithLevels(dag);
    }).toThrow('Cyclic dependency detected in the task graph');
  });

  test('任务依赖不存在的任务', async () => {
    const taskA = new TaskA();
    const taskB = new TaskB();
    const taskC = new TaskC();

    // TaskB 依赖一个不存在于 DAG 中的任务
    const nonExistentTask = new TaskD();
    taskB.dependsOn = [nonExistentTask];
    taskC.dependsOn = [taskB];

    const dag: DAG = {
      tasks: [taskA, taskB, taskC], // nonExistentTask 不在任务列表中
    };

    expect(() => {
      DAGParser.getExecutionOrderWithLevels(dag);
    }).toThrow(); // 应该抛出错误
  });

  test('大规模DAG性能测试', async () => {
    const taskCount = 1000;
    const tasks = Array.from({ length: taskCount }, (_, i) => {
      const task = new TaskA();
      task.name = `Task${i}`;
      return task;
    });

    // 创建随机依赖关系（确保不会形成循环）
    for (let i = 1; i < tasks.length; i++) {
      // 每个任务随机依赖前面的1-3个任务
      const dependencyCount = Math.floor(Math.random() * 3) + 1;
      const dependencies: TaskA[] = [];
      for (let j = 0; j < dependencyCount && i - j - 1 >= 0; j++) {
        dependencies.push(tasks[i - j - 1]);
      }
      tasks[i].dependsOn = dependencies;
    }

    const dag: DAG = {
      tasks: tasks,
    };

    const startTime = Date.now();
    const response = DAGParser.getExecutionOrderWithLevels(dag);
    const endTime = Date.now();

    expect(response.length).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(1000);
  });
});

