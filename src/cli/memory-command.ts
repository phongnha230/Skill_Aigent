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

function parseMemoryArgs(args: string[]): { subcommand: string; sessionId: string | undefined } {
  let subcommand = "show";
  let sessionId: string | undefined;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--session" && args[index + 1]) {
      sessionId = args[++index];
      continue;
    }

    if (arg && !arg.startsWith("--")) {
      subcommand = arg;
    }
  }

  return { subcommand, sessionId };
}

export async function handleMemoryCommand(args: string[], store?: MemoryStore): Promise<void> {
  const { subcommand, sessionId } = parseMemoryArgs(args);
  const memoryStore = store ?? new MemoryStore(sessionId);

  if (subcommand === "show") {
    console.log(formatMemoryMessages(memoryStore.load()));
    return;
  }

  if (subcommand === "path") {
    console.log(memoryStore.filePath);
    return;
  }

  if (subcommand === "clear") {
    memoryStore.clear();
    console.log("Memory cleared.");
    return;
  }

  console.log(`Unknown memory command: ${subcommand}`);
  console.log("Available memory commands: show, path, clear");
}
