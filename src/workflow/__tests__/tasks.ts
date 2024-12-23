import type { WorkflowDefinition } from "../Workflow";
import type { Task, TaskInput, TaskOutput } from "../Task";

export class DataCleanTask implements Task {
  name = "DataCleanTask";

  async execute(input: TaskInput): Promise<TaskOutput> {
    const rawData = input.rawData;
    const cleanedData = rawData.trim().replace(/\s+/g, ' ').toLowerCase();
    return { ...input, cleanedData };
  }
}

export class IntentRecognitionTask implements Task {
  name = "IntentRecognitionTask";

  async execute(input: TaskInput): Promise<TaskOutput> {
    const cleanedData = input.cleanedData.toLowerCase();
    const intent = cleanedData.includes("weather") ? "weather_query" : "unknown";
    return { ...input, intent };
  }
}

export class WeatherTask implements Task {
  name = "WeatherTask";

  async execute(input: TaskInput): Promise<TaskOutput> {
    return {
      ...input,
      weatherInfo: { temperature: '25°C', condition: 'Sunny' }
    };
  }
}

export class DefaultTask implements Task {
  name = "DefaultTask";

  async execute(input: TaskInput): Promise<TaskOutput> {
    return { 
      ...input,
      defaultResponse: "I'm sorry, I don't understand your request." 
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
          condition: context => context.get("intent") === "weather_query",
          next: new WeatherTask(),
        },
      ],
      default: new DefaultTask(),
    },
  ],
};
