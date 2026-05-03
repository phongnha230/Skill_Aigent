import { OpenAI } from "openai";
import { Message } from "../core/memory.js";
import { ToolCallDefinition } from "../tools/tool-manager.js";

export interface LLMProvider {
  /**
   * Completes a chat request.
   * @param messages The conversation history
   * @param tools Optional list of tools the model can call
   */
  generateResponse(messages: Message[], tools: ToolCallDefinition[]): Promise<OpenAI.Chat.ChatCompletionMessage>;
}
