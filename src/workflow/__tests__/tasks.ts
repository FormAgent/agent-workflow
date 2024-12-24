import type { Task, TaskInput, TaskOutput } from '../Task';
import type { WorkflowDefinition } from '../Workflow';
import { z } from 'zod';

// Input/Output Schemas
export const WeatherInputSchema = z.object({
  rawData: z.string(),
  cleanedData: z.string().optional(),
  intent: z.string().optional(),
});

export const WeatherOutputSchema = z.object({
  weatherInfo: z.object({
    temperature: z.string(),
    condition: z.string(),
  }),
});

export class DataCleanTask implements Task {
  name = 'DataCleanTask';
  inputSchema = z.object({ rawData: z.string() });
  outputSchema = z.object({
    rawData: z.string(),
    cleanedData: z.string(),
  });

  async execute(input: TaskInput): Promise<TaskOutput> {
    const validatedInput = this.inputSchema.parse(input);
    const rawData = validatedInput.rawData;
    const cleanedData = rawData.trim().replace(/\s+/g, ' ').toLowerCase();
    const output = { ...input, cleanedData };
    return this.outputSchema.parse(output);
  }
}

export class IntentRecognitionTask implements Task {
  name = 'IntentRecognitionTask';
  inputSchema = z.object({
    cleanedData: z.string(),
    rawData: z.string(),
  });
  outputSchema = z.object({
    cleanedData: z.string(),
    rawData: z.string(),
    intent: z.string(),
  });

  async execute(input: TaskInput): Promise<TaskOutput> {
    const validatedInput = this.inputSchema.parse(input);
    const cleanedData = validatedInput.cleanedData.toLowerCase();
    const intent = cleanedData.includes('weather')
      ? 'weather_query'
      : 'unknown';
    const output = { ...input, intent };
    return this.outputSchema.parse(output);
  }
}

export class WeatherTask implements Task {
  name = 'WeatherTask';
  inputSchema = WeatherInputSchema;
  outputSchema = WeatherOutputSchema;

  async execute(input: TaskInput): Promise<TaskOutput> {
    this.inputSchema.parse(input);
    const output = {
      ...input,
      weatherInfo: { temperature: '25°C', condition: 'Sunny' },
    };
    return this.outputSchema.parse(output);
  }
}

export class DefaultTask implements Task {
  name = 'DefaultTask';

  async execute(input: TaskInput): Promise<TaskOutput> {
    return {
      ...input,
      defaultResponse: "I'm sorry, I don't understand your request.",
    };
  }
}

export const workflowDefinition: WorkflowDefinition = {
  steps: [
    new DataCleanTask(),
    new IntentRecognitionTask(),
    {
      branches: [
        {
          condition: (context) => context.get('intent') === 'weather_query',
          next: new WeatherTask(),
        },
      ],
      default: new DefaultTask(),
    },
  ],
};
