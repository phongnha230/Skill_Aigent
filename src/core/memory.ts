import { OpenAI } from "openai";

export type Message = OpenAI.Chat.ChatCompletionMessageParam;

export class Memory {
  private history: Message[] = [];

  constructor(systemPrompt?: string) {
    if (systemPrompt) {
      this.history.push({ role: "system", content: systemPrompt });
    }
  }

  addMessage(message: Message) {
    this.history.push(message);
  }

  getHistory(): Message[] {
    return this.history;
  }

  clear() {
    const system = this.history.find(m => m.role === 'system');
    this.history = system ? [system] : [];
  }
}
