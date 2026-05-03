import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { agentConfig } from "../config/agent.js";

interface AuditToolCall {
  at: string;
  name: string;
  arguments: unknown;
  result: unknown;
}

interface AuditRunFile {
  version: 1;
  runId: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "completed" | "failed";
  userInput: string;
  assistantMessages: string[];
  toolCalls: AuditToolCall[];
  error?: string;
}

function parseJsonValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function truncateValue(value: unknown): unknown {
  if (typeof value === "string" && value.length > agentConfig.auditMaxValueLength) {
    return `${value.slice(0, agentConfig.auditMaxValueLength)}...<truncated>`;
  }

  if (Array.isArray(value)) {
    return value.map(item => truncateValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [key, truncateValue(entryValue)])
    );
  }

  return value;
}

function createRunFileName(startedAt: string, runId: string): string {
  return `${startedAt.replace(/[:.]/g, "-")}-${runId}.json`;
}

export class AuditLogger {
  readonly runsDir: string;
  private runs: Map<string, AuditRunFile> = new Map();

  constructor(runsDir: string = path.join(agentConfig.workspaceRoot, agentConfig.memoryDirName, agentConfig.auditRunDirName)) {
    this.runsDir = runsDir;
  }

  startRun(userInput: string): string {
    const startedAt = new Date().toISOString();
    const runId = randomUUID();
    const run: AuditRunFile = {
      version: 1,
      runId,
      startedAt,
      status: "running",
      userInput,
      assistantMessages: [],
      toolCalls: [],
    };
    this.runs.set(runId, run);
    this.writeRun(run);
    return runId;
  }

  logAssistantMessage(runId: string, content: string | null): void {
    const run = this.getRun(runId);
    run.assistantMessages.push(content ?? "");
    this.writeRun(run);
  }

  logToolCall(runId: string, name: string, args: string, result: string): void {
    const run = this.getRun(runId);
    run.toolCalls.push({
      at: new Date().toISOString(),
      name,
      arguments: truncateValue(parseJsonValue(args)),
      result: truncateValue(parseJsonValue(result)),
    });
    this.writeRun(run);
  }

  finishRun(runId: string): void {
    const run = this.getRun(runId);
    run.status = "completed";
    run.finishedAt = new Date().toISOString();
    this.writeRun(run);
  }

  failRun(runId: string, error: unknown): void {
    const run = this.getRun(runId);
    run.status = "failed";
    run.finishedAt = new Date().toISOString();
    run.error = error instanceof Error ? error.message : String(error);
    this.writeRun(run);
  }

  private getRun(runId: string): AuditRunFile {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Audit run not found: ${runId}`);
    }
    return run;
  }

  private writeRun(run: AuditRunFile): void {
    if (!fs.existsSync(this.runsDir)) {
      fs.mkdirSync(this.runsDir, { recursive: true });
    }

    const filePath = path.join(this.runsDir, createRunFileName(run.startedAt, run.runId));
    fs.writeFileSync(filePath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  }
}
