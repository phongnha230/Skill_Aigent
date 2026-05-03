import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { agentConfig } from "../config/agent.js";
import { ToolDefinition } from "./tool-manager.js";

const workspaceRoot = agentConfig.workspaceRoot;
const defaultTextExtensions = new Set([
  ".cjs",
  ".css",
  ".env",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

interface FileEntry {
  path: string;
  size: number;
}

interface SearchMatch {
  filePath: string;
  lineNumber: number;
  line: string;
}

function resolveWorkspacePath(inputPath: string = "."): string {
  const fullPath = path.resolve(workspaceRoot, inputPath);
  const relativePath = path.relative(workspaceRoot, fullPath);
  const isInsideWorkspace =
    relativePath === "" || (!!relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath));

  if (!isInsideWorkspace) {
    throw new Error(`Path escapes workspace root: ${inputPath}`);
  }

  return fullPath;
}

function toWorkspaceRelativePath(fullPath: string): string {
  return path.relative(workspaceRoot, fullPath).replace(/\\/g, "/");
}

function shouldIgnoreDirectory(dirName: string): boolean {
  return agentConfig.projectMapIgnoredDirs.has(dirName);
}

function normalizeExtensions(extensions?: string[]): Set<string> | undefined {
  if (!extensions || extensions.length === 0) {
    return undefined;
  }

  return new Set(extensions.map(extension => (extension.startsWith(".") ? extension : `.${extension}`)));
}

function collectFiles(startDir: string, extensions?: Set<string>, maxResults = 200): FileEntry[] {
  const results: FileEntry[] = [];

  function walk(currentDir: string): void {
    if (results.length >= maxResults) {
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxResults) {
        return;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!shouldIgnoreDirectory(entry.name)) {
          walk(fullPath);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name);
      if (extensions && !extensions.has(extension)) {
        continue;
      }

      const stat = fs.statSync(fullPath);
      results.push({
        path: toWorkspaceRelativePath(fullPath),
        size: stat.size,
      });
    }
  }

  walk(startDir);
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const listFilesTool: ToolDefinition = {
  name: "list_files",
  description: "Lists files inside the current workspace, ignoring generated and dependency directories.",
  parameters: z.object({
    directory: z.string().optional().describe("Workspace-relative directory to list. Defaults to project root."),
    extensions: z.array(z.string()).optional().describe("Optional file extensions to include, e.g. ['.ts', '.md']."),
    maxResults: z.number().int().min(1).max(1000).optional().describe("Maximum number of files to return."),
  }),
  execute: async ({ directory, extensions, maxResults }) => {
    const startDir = resolveWorkspacePath(directory);
    if (!fs.existsSync(startDir)) {
      return { files: [], error: "Directory not found" };
    }
    if (!fs.statSync(startDir).isDirectory()) {
      return { files: [], error: "Path is not a directory" };
    }

    return {
      files: collectFiles(startDir, normalizeExtensions(extensions), maxResults ?? 200),
    };
  },
};

export const searchCodeTool: ToolDefinition = {
  name: "search_code",
  description: "Searches text files inside the current workspace and returns file path, line number, and matching line.",
  parameters: z.object({
    pattern: z.string().min(1).describe("Text or regex pattern to search for."),
    directory: z.string().optional().describe("Workspace-relative directory to search. Defaults to project root."),
    extensions: z.array(z.string()).optional().describe("Optional file extensions to include, e.g. ['.ts', '.md']."),
    caseSensitive: z.boolean().optional().describe("Whether matching should be case-sensitive. Defaults to false."),
    regex: z.boolean().optional().describe("Treat pattern as a regular expression. Defaults to false."),
    maxResults: z.number().int().min(1).max(1000).optional().describe("Maximum number of matches to return."),
  }),
  execute: async ({ pattern, directory, extensions, caseSensitive, regex, maxResults }) => {
    const startDir = resolveWorkspacePath(directory);
    if (!fs.existsSync(startDir)) {
      return { matches: [], error: "Directory not found" };
    }
    if (!fs.statSync(startDir).isDirectory()) {
      return { matches: [], error: "Path is not a directory" };
    }

    const includeExtensions = normalizeExtensions(extensions) ?? defaultTextExtensions;
    const files = collectFiles(startDir, includeExtensions, 5000);
    const flags = caseSensitive ? "" : "i";
    const matcher = new RegExp(regex ? pattern : escapeRegex(pattern), flags);
    const matches: SearchMatch[] = [];
    const limit = maxResults ?? 100;

    for (const file of files) {
      if (matches.length >= limit) {
        break;
      }

      const fullPath = path.join(workspaceRoot, file.path);
      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split(/\r?\n/);
      for (let index = 0; index < lines.length; index++) {
        if (matches.length >= limit) {
          break;
        }

        const line = lines[index] ?? "";
        matcher.lastIndex = 0;
        if (matcher.test(line)) {
          matches.push({
            filePath: file.path,
            lineNumber: index + 1,
            line: line.trim(),
          });
        }
      }
    }

    return { matches };
  },
};
