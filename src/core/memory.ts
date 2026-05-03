import { OpenAI } from "openai";

export type Message = OpenAI.Chat.ChatCompletionMessageParam;

export class Memory {
  private history: Message[] = [];

  constructor(systemPrompt?: string, persistedMessages: Message[] = []) {
    if (systemPrompt) {
      this.history.push({ role: "system", content: systemPrompt });
    }
    this.history.push(...persistedMessages.filter(message => message.role !== "system"));
  }

  addMessage(message: Message) {
    this.history.push(message);
  }

  getHistory(): Message[] {
    return this.history;
  }

  getPersistableHistory(): Message[] {
    return this.history.filter(message => message.role !== "system");
  }

  clear() {
    const system = this.history.find(m => m.role === 'system');
    this.history = system ? [system] : [];
  }
}
