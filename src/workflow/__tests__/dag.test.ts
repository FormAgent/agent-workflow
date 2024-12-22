import { ContextManager } from '../ContextManager';
import { DAG, DAGParser } from '../DAG';
import { TaskExecutor } from '../TaskExecutor';
import type { TaskInput, TaskOutput, TaskRegistry } from '../TaskRegistry';
import { WorkflowEngine } from '../Workflow';

const execute = async (input: TaskInput): Promise<TaskOutput> => {
  return {};
};

describe('AIAgent', () => {
  beforeEach(() => {});

  test('dag1', async () => {
    const dag1: DAG = {
      tasks: [
        { name: 'TaskA', execute },
        { name: 'TaskB', dependsOn: ['TaskA'], execute },
        { name: 'TaskC', dependsOn: ['TaskB'], execute },
        { name: 'TaskD', dependsOn: ['TaskA'], execute },
      ],
    };
    const resposne = DAGParser.getExecutionOrderWithLevels(dag1);
    console.log(resposne); 
    expect(resposne.length).toBe(3);
    expect(resposne[0].level).toBe(0);
    expect(resposne[0].tasks).toEqual(['TaskA']);
    expect(resposne[1].level).toBe(1);
    expect(resposne[1].tasks).toEqual(['TaskB', 'TaskD']);
    expect(resposne[2].level).toBe(2);
    expect(resposne[2].tasks).toEqual(['TaskC']);
  });

  test('dag2', async () => {
    const dag2: DAG = {
      tasks: [
        { name: "TaskA", execute },
        { name: "TaskB", dependsOn: ["TaskA"], execute },
        { name: "TaskC", dependsOn: ["TaskA"], execute },
        { name: "TaskD", dependsOn: ["TaskB", "TaskC"], execute },
      ],
    };
    const resposne = DAGParser.getExecutionOrderWithLevels(dag2);
    console.log(resposne); 
    expect(resposne.length).toBe(3);
    expect(resposne[0].level).toBe(0);
    expect(resposne[0].tasks).toEqual(['TaskA']);
    expect(resposne[1].level).toBe(1);
    expect(resposne[1].tasks).toEqual(['TaskB', 'TaskC']);
    expect(resposne[2].level).toBe(2);
    expect(resposne[2].tasks).toEqual(['TaskD']);
  });

  test('dag3', async () => {
    const dag3: DAG = {
      tasks: [
        { name: "TaskA", execute },
        { name: "TaskB" , execute},
        { name: "TaskC", execute },
      ],
    };
    const resposne = DAGParser.getExecutionOrderWithLevels(dag3);
    console.log(resposne); 
    expect(resposne.length).toBe(1);
    expect(resposne[0].level).toBe(0);
    expect(resposne[0].tasks).toEqual(['TaskA','TaskB','TaskC']);
  });

  test('dag4', async () => {
    const dag4: DAG = {
      tasks: [
        { name: "TaskA", dependsOn: ["TaskC"], execute },
        { name: "TaskB", dependsOn: ["TaskA"], execute },
        { name: "TaskC", dependsOn: ["TaskB"], execute },
      ],
    };
    expect(() => {
    const resposne = DAGParser.getExecutionOrderWithLevels(dag4);
    console.log(resposne); 
    }).toThrow("Cyclic dependency detected in the task graph");
  });

});
