import { z } from "zod";
import { ToolDefinition } from "./tool-manager.js";
import * as fs from "fs";
import * as path from "path";
import { agentConfig } from "../config/agent.js";

const workspaceRoot = agentConfig.workspaceRoot;

function resolveWorkspacePath(filePath: string): string {
  const fullPath = path.resolve(workspaceRoot, filePath);
  const relativePath = path.relative(workspaceRoot, fullPath);
  const isInsideWorkspace =
    relativePath === "" || (!!relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath));

  if (!isInsideWorkspace) {
    throw new Error(`Path escapes workspace root: ${filePath}`);
  }

  return fullPath;
}

export const writeFileTool: ToolDefinition = {
  name: "write_file",
  description: "Writes content to a file inside the current workspace. Overwrites if file exists.",
  parameters: z.object({
    filePath: z.string().describe("The path to the file relative to current directory"),
    content: z.string().describe("The content to write to the file"),
  }),
  execute: async ({ filePath, content }) => {
    const fullPath = resolveWorkspacePath(filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, "utf8");
    return { success: true, path: filePath };
  }
};

export const readFileTool: ToolDefinition = {
  name: "read_file",
  description: "Reads the content of a file inside the current workspace.",
  parameters: z.object({
    filePath: z.string().describe("The path to the file to read"),
  }),
  execute: async ({ filePath }) => {
    const fullPath = resolveWorkspacePath(filePath);
    if (!fs.existsSync(fullPath)) {
      return { error: "File not found" };
    }
    const content = fs.readFileSync(fullPath, "utf8");
    return { content };
  }
};
