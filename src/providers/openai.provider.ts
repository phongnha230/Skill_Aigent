import { OpenAI } from "openai";
import { LLMProvider } from "./llm.interface.js";
import { Message } from "../core/memory.js";
import { ToolCallDefinition } from "../tools/tool-manager.js";
import { env } from "../config/env.js";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(model: string = env.OPENAI_MODEL ?? "gpt-4-turbo-preview") {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = model;
  }

  async generateResponse(messages: Message[], tools: ToolCallDefinition[]): Promise<OpenAI.Chat.ChatCompletionMessage> {
    const requestBody: any = {
      model: this.model,
      messages: messages,
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = "auto";
    }

    const response = await this.client.chat.completions.create(requestBody);

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("No message received from OpenAI.");
    }
    return message;
  }
}
