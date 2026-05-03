import * as fs from "fs";
import * as path from "path";
import { agentConfig } from "../config/agent.js";
import { analyzeLogContent } from "../utils/log-analyzer.js";
import { Orchestrator } from "../core/engine.js";

function resolveWorkspacePath(filePath: string): string {
  const fullPath = path.resolve(agentConfig.workspaceRoot, filePath);
  const relativePath = path.relative(agentConfig.workspaceRoot, fullPath);
  const isInsideWorkspace =
    relativePath === "" || (!!relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath));

  if (!isInsideWorkspace) {
    throw new Error(`Path escapes workspace root: ${filePath}`);
  }

  return fullPath;
}

export class LogDiagnosisWorkflow {
  constructor(private readonly orchestrator: Orchestrator) {}

  async diagnoseCommand(command: string): Promise<void> {
    const prompt = [
      `Run this verification command: ${command}`,
      "",
      "If it fails, use analyze_log on the command stdout/stderr.",
      "Use extracted file paths and line numbers to inspect the relevant source.",
      "Explain the root cause, make the smallest safe fix, and rerun the command once.",
    ].join("\n");

    await this.orchestrator.run(prompt);
  }

  async fixLogFile(filePath: string): Promise<void> {
    const fullPath = resolveWorkspacePath(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Log file not found: ${filePath}`);
    }

    const content = fs.readFileSync(fullPath, "utf8");
    const analysis = analyzeLogContent(content);
    const prompt = [
      `Analyze and fix based on this log file: ${filePath}`,
      "",
      "Pre-analyzed log summary:",
      JSON.stringify(analysis, null, 2),
      "",
      "Use the extracted file paths and line numbers to inspect the relevant source.",
      "Explain the root cause, make the smallest safe fix, and run the most relevant verification command once.",
    ].join("\n");

    await this.orchestrator.run(prompt);
  }
}
