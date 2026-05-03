import { Message } from "../core/memory.js";
import { MemoryStore } from "../core/memory-store.js";

function stringifyContent(content: Message["content"]): string {
  if (typeof content === "string") {
    return content;
  }

  if (!content) {
    return "";
  }

  return JSON.stringify(content);
}

export function formatMemoryMessages(messages: Message[]): string {
  if (messages.length === 0) {
    return "No memory found.";
  }

  return messages
    .map((message, index) => {
      const content = stringifyContent(message.content).replace(/\s+/g, " ").trim();
      return `${index + 1}. [${message.role}] ${content}`;
    })
    .join("\n");
}

export async function handleMemoryCommand(args: string[], store: MemoryStore = new MemoryStore()): Promise<void> {
  const subcommand = args[0] ?? "show";

  if (subcommand === "show") {
    console.log(formatMemoryMessages(store.load()));
    return;
  }

  if (subcommand === "path") {
    console.log(store.filePath);
    return;
  }

  if (subcommand === "clear") {
    store.clear();
    console.log("Memory cleared.");
    return;
  }

  console.log(`Unknown memory command: ${subcommand}`);
  console.log("Available memory commands: show, path, clear");
}
