import type { WorkflowDefinition } from "../Workflow";
import type { Task, TaskInput, TaskOutput } from "../TaskRegistry";

export class DataCleanTask implements Task {
  name = "DataCleanTask";

  async execute(input: TaskInput): Promise<TaskOutput> {
    const rawData = input.rawData;
    const cleanedData = rawData.trim().toLowerCase();
    return { cleanedData };
  }
}

export class IntentRecognitionTask implements Task {
  name = "IntentRecognitionTask";

  async execute(input: TaskInput): Promise<TaskOutput> {
    const cleanedData = input.cleanedData;
    const intent = cleanedData.includes("weather") ? "weather_query" : "unknown";
    return { intent };
  }
}

export class WeatherTask implements Task {
  name = "WeatherTask";

  async execute(input: TaskInput): Promise<TaskOutput> {
    return { response: "Today's weather is sunny." };
  }
}

export class DefaultTask implements Task {
  name = "DefaultTask";

  async execute(input: TaskInput): Promise<TaskOutput> {
    return { response: "I'm sorry, I don't understand your request." };
  }
}

export const workflowDefinition: WorkflowDefinition = {
  steps: [
    DataCleanTask.name,
    IntentRecognitionTask.name,
    {
      branches: [
        {
          condition: context => context.get("intent") === "weather_query",
          next: WeatherTask.name,
        },
      ],
      default: DefaultTask.name,
    },
  ],
};
