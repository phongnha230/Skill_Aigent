import { z } from "zod";
import { ToolDefinition } from "./tool-manager.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import { agentConfig } from "../config/agent.js";

const execAsync = promisify(exec);
const workspaceRoot = agentConfig.workspaceRoot;
let allowUnsafeTerminal = false;

const blockedCommandPatterns = [
  /\brm\s+-rf\b/i,
  /\bdel\s+\/[sq]\b/i,
  /\brmdir\s+\/s\b/i,
  /\bRemove-Item\b.*\b-Recurse\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bformat\b/i,
  /\bshutdown\b/i,
];

const shellControlOperatorPattern = /(\|\||&&|;|\||`|\$\(|>|<)/;

export function configureTerminalTool(options: { allowUnsafeTerminal?: boolean }): void {
  allowUnsafeTerminal = options.allowUnsafeTerminal ?? false;
}

function resolveWorkspaceCwd(cwd?: string): string {
  const fullPath = cwd ? path.resolve(workspaceRoot, cwd) : workspaceRoot;
  const relativePath = path.relative(workspaceRoot, fullPath);
  const isInsideWorkspace =
    relativePath === "" || (!!relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath));

  if (!isInsideWorkspace) {
    throw new Error(`cwd escapes workspace root: ${cwd}`);
  }

  return fullPath;
}

function assertCommandAllowed(command: string): void {
  const blockedPattern = blockedCommandPatterns.find(pattern => pattern.test(command));
  if (blockedPattern) {
    throw new Error(`Command rejected by safety policy: ${blockedPattern}`);
  }

  if (allowUnsafeTerminal) {
    return;
  }

  if (shellControlOperatorPattern.test(command)) {
    throw new Error("Command rejected by safety policy: shell control operators require --unsafe-terminal");
  }

  const isAllowed = agentConfig.terminalAllowedCommandPatterns.some(pattern => pattern.test(command.trim()));
  if (!isAllowed) {
    throw new Error(`Command is not in the safe terminal allowlist: ${command}`);
  }
}

export const terminalTool: ToolDefinition = {
  name: "run_terminal_command",
  description: "Executes an allowlisted shell command inside the current workspace. Use this to inspect, build, or test the project.",
  parameters: z.object({
    command: z.string().describe("The command to execute (e.g., 'npm install axios')"),
    cwd: z.string().optional().describe("Optional working directory. Defaults to current project root."),
  }),
  execute: async ({ command, cwd }) => {
    try {
      assertCommandAllowed(command);
      const safeCwd = resolveWorkspaceCwd(cwd);
      const { stdout, stderr } = await execAsync(command, {
        cwd: safeCwd,
        timeout: agentConfig.terminalTimeoutMs,
        maxBuffer: agentConfig.terminalMaxBufferBytes,
      });
      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        stdout: error.stdout?.toString().trim(),
        stderr: error.stderr?.toString().trim()
      };
    }
  }
};
