import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { agentConfig } from "../config/agent.js";
import { analyzeLogContent } from "../utils/log-analyzer.js";
import { ToolDefinition } from "./tool-manager.js";

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

export const analyzeLogTool: ToolDefinition = {
  name: "analyze_log",
  description: "Analyzes error logs or command output and extracts error lines plus file:line locations.",
  parameters: z.object({
    content: z.string().optional().describe("Raw log or command output to analyze."),
    filePath: z.string().optional().describe("Workspace-relative log file path to analyze."),
    maxResults: z.number().int().min(1).max(200).optional().describe("Maximum number of errors/locations to return."),
  }),
  execute: async ({ content, filePath, maxResults }) => {
    if (!content && !filePath) {
      return { error: "Provide either content or filePath." };
    }

    const logContent = content ?? fs.readFileSync(resolveWorkspacePath(filePath), "utf8");
    return analyzeLogContent(logContent, maxResults ?? 50);
  },
};
