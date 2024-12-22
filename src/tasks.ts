import type { Task, TaskInput, TaskOutput } from "./workflow/TaskRegistry";

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
