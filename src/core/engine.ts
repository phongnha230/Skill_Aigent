import { Memory } from "./memory.js";
import { ToolManager } from "../tools/tool-manager.js";
import { LLMProvider } from "../providers/llm.interface.js";
import chalk from "chalk";
import { OpenAI } from "openai";

export class Orchestrator {
  private provider: LLMProvider;
  private memory: Memory;
  private toolManager: ToolManager;

  constructor(systemPrompt: string, toolManager: ToolManager, provider: LLMProvider) {
    this.provider = provider;
    this.memory = new Memory(systemPrompt);
    this.toolManager = toolManager;
  }

  async run(userInput: string) {
    console.log(chalk.blue("\n[User]: ") + userInput);
    this.memory.addMessage({ role: "user", content: userInput });

    let isFinished = false;
    let turnCount = 0;
    const maxTurns = 5;

    while (!isFinished && turnCount < maxTurns) {
      turnCount++;
      console.log(chalk.yellow(`\n[Agent]: Thinking (Turn ${turnCount})...`));

      const message = await this.provider.generateResponse(
        this.memory.getHistory(),
        this.toolManager.getToolDefinitions()
      );
      this.memory.addMessage(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== "function") continue;

          const toolName = toolCall.function.name;
          const toolArgs = toolCall.function.arguments;

          console.log(chalk.cyan(`[Action]: Calling tool ${toolName} with args: ${toolArgs}`));
          
          const result = await this.toolManager.executeTool(toolName, toolArgs);
          
          console.log(chalk.green(`[Observation]: Tool result received.`));

          const toolMessage: OpenAI.Chat.ChatCompletionToolMessageParam = {
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          };
          this.memory.addMessage(toolMessage);
        }
      } else {
        console.log(chalk.magenta("\n[Agent]: ") + (message.content || "No content."));
        isFinished = true;
      }
    }

    if (turnCount >= maxTurns) {
      console.log(chalk.red("\n[System]: Reached maximum turns. Stopping loop."));
    }
  }
}
