export const agentConfig = {
  workspaceRoot: process.cwd(),
  maxTurns: 5,
  defaultOpenAIModel: "gpt-4-turbo-preview",
  terminalTimeoutMs: 120_000,
  terminalMaxBufferBytes: 1024 * 1024,
  autoHealMaxAttempts: 2,
  memoryDirName: ".nexus",
  memoryFileName: "history.json",
  projectMapMaxFiles: 200,
  projectMapIgnoredDirs: new Set([".git", ".nexus", ".tmp-build", ".tmp-test", "dist", "node_modules"]),
} as const;
