import * as fs from "fs";
import * as path from "path";
import { agentConfig } from "../config/agent.js";
import { Message } from "./memory.js";

interface PersistedMemoryFile {
  version: 1;
  updatedAt: string;
  sessionId: string;
  messages: Message[];
}

function sanitizeSessionId(sessionId: string): string {
  const normalized = sessionId.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!normalized) {
    throw new Error("Session id must contain at least one letter or number.");
  }
  return normalized;
}

export function resolveMemoryFilePath(sessionId?: string): string {
  if (!sessionId || sessionId === "default") {
    return path.join(agentConfig.workspaceRoot, agentConfig.memoryDirName, agentConfig.memoryFileName);
  }

  return path.join(
    agentConfig.workspaceRoot,
    agentConfig.memoryDirName,
    agentConfig.sessionMemoryDirName,
    `${sanitizeSessionId(sessionId)}.json`
  );
}

export class MemoryStore {
  readonly filePath: string;
  readonly sessionId: string;

  constructor(filePathOrSessionId?: string, options: { isFilePath?: boolean } = {}) {
    this.sessionId = options.isFilePath ? "test" : filePathOrSessionId ?? "default";
    this.filePath = options.isFilePath ? filePathOrSessionId ?? resolveMemoryFilePath() : resolveMemoryFilePath(filePathOrSessionId);
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
      sessionId: this.sessionId,
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
