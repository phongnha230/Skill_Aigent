import * as fs from "fs";
import * as path from "path";
import { agentConfig } from "../config/agent.js";
import { Message } from "./memory.js";

interface PersistedMemoryFile {
  version: 1;
  updatedAt: string;
  messages: Message[];
}

export class MemoryStore {
  readonly filePath: string;

  constructor(
    filePath: string = path.join(agentConfig.workspaceRoot, agentConfig.memoryDirName, agentConfig.memoryFileName)
  ) {
    this.filePath = filePath;
  }

  load(): Message[] {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    const raw = fs.readFileSync(this.filePath, "utf8");
    const parsed = JSON.parse(raw) as PersistedMemoryFile;
    if (!Array.isArray(parsed.messages)) {
      return [];
    }

    return parsed.messages;
  }

  save(messages: Message[]): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const payload: PersistedMemoryFile = {
      version: 1,
      updatedAt: new Date().toISOString(),
      messages: messages.filter(message => message.role !== "system"),
    };

    fs.writeFileSync(this.filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  clear(): void {
    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
    }
  }
}
