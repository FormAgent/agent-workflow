import { ContextManager } from '../ContextManager';
import { WorkflowEngine } from '../Workflow';
import { TaskExecutor } from '../TaskExecutor';
import {
  DataCleanTask,
  WeatherOutputSchema,
  workflowDefinition,
} from './tasks';
import { z } from 'zod';

describe('Task Schema Validation', () => {
  let context: ContextManager;
  let executor: TaskExecutor;
  let engine: WorkflowEngine;

  beforeEach(() => {
    context = new ContextManager();
    executor = new TaskExecutor(context);
    engine = new WorkflowEngine(executor);
  });

  it('should validate input/output for DataCleanTask', async () => {
    const task = new DataCleanTask();
    const input = { rawData: '  hello   world  ' };
    const output = await task.execute(input);

    expect(output.cleanedData).toBe('hello world');
  });

  it('should validate input/output for weather workflow', async () => {
    context.set('rawData', 'what is the weather today');
    await engine.run(workflowDefinition);

    const weatherInfo = context.get('weatherInfo');
    expect(
      WeatherOutputSchema.shape.weatherInfo.parse(weatherInfo)
    ).toBeDefined();
  });

  it('should throw on invalid input', async () => {
    const task = new DataCleanTask();
    const invalidInput = { wrongField: 'test' };

    await expect(task.execute(invalidInput)).rejects.toThrow();
  });

  it('should validate full workflow with schemas', async () => {
    context.set('rawData', 'what is the weather today');
    await engine.run(workflowDefinition);

    // Validate final state
    const finalState = {
      rawData: context.get('rawData'),
      cleanedData: context.get('cleanedData'),
      intent: context.get('intent'),
      weatherInfo: context.get('weatherInfo'),
    };

    const FinalStateSchema = z.object({
      rawData: z.string(),
      cleanedData: z.string(),
      intent: z.string(),
      weatherInfo: z.object({
        temperature: z.string(),
        condition: z.string(),
      }),
    });

    expect(() => FinalStateSchema.parse(finalState)).not.toThrow();
  });
});
