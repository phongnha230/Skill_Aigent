#!/usr/bin/env node
import type { McpOptions } from "./agents/coder-agent.js";

function printHelp(): void {
  console.log(`
Nexus Agent

Usage:
  npm start -- [options] "<task>"
  npm start -- chat [options]
  npm start -- memory <show|path|clear> [--session <name>]
  npm start -- audit <list|path|show>

Options:
  --help            Show this help message
  --skill <name>    Skill markdown file from ./skills, with or without .md
  --workflow        Run the software-development workflow
  --auto-heal       Run a bounded verify/fix/retry workflow
  --no-memory       Do not load or save .nexus/history.json
  --no-project-map  Do not inject the initial project map into the system prompt
  --unsafe-terminal Allow non-allowlisted terminal commands. Use only in trusted workspaces
  --session <name>  Use a named memory session
  --no-audit        Do not write .nexus/runs audit logs
  --mcp-postgres    Enable PostgreSQL MCP tools
  --mcp-mysql       Enable MySQL MCP tools
  --mcp-mongodb     Enable MongoDB MCP tools
  --mcp-github      Enable GitHub MCP tools
  --mcp-docker      Enable Docker MCP tools

Examples:
  npm start -- --skill nodejs-expert "Review this API design"
  npm start -- chat --session api --skill nodejs-expert
  npm start -- memory show --session api
  npm start -- audit show latest
  npm start -- --workflow --skill java-spring-expert "Create a user module"
  npm start -- --auto-heal "Fix the failing tests"
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  if (args[0] === "memory") {
    const { handleMemoryCommand } = await import("./cli/memory-command.js");
    await handleMemoryCommand(args.slice(1));
    return;
  }

  if (args[0] === "audit") {
    const { handleAuditCommand } = await import("./cli/audit-command.js");
    await handleAuditCommand(args.slice(1));
    return;
  }

  let skillFileName = "coding-assistant.md";
  let userInput = "Hello! Tell me who you are and what you can do.";
  let useWorkflow = false;
  let useAutoHeal = false;
  let useChat = false;
  let persistMemory = true;
  let includeProjectMap = true;
  let allowUnsafeTerminal = false;
  let sessionId: string | undefined;
  let auditEnabled = true;
  const mcpOptions: McpOptions = {};

  const inputArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg === "chat") {
      useChat = true;
    } else if (arg === "--skill" && i + 1 < args.length) {
      const skillArg = args[++i] as string;
      skillFileName = skillArg.endsWith(".md") ? skillArg : `${skillArg}.md`;
    } else if (arg === "--workflow") {
      useWorkflow = true;
    } else if (arg === "--auto-heal") {
      useAutoHeal = true;
    } else if (arg === "--no-memory") {
      persistMemory = false;
    } else if (arg === "--no-project-map") {
      includeProjectMap = false;
    } else if (arg === "--unsafe-terminal") {
      allowUnsafeTerminal = true;
    } else if (arg === "--session" && i + 1 < args.length) {
      sessionId = args[++i];
    } else if (arg === "--no-audit") {
      auditEnabled = false;
    } else if (arg === "--mcp-postgres") {
      mcpOptions.postgres = true;
    } else if (arg === "--mcp-mysql") {
      mcpOptions.mysql = true;
    } else if (arg === "--mcp-mongodb") {
      mcpOptions.mongodb = true;
    } else if (arg === "--mcp-github") {
      mcpOptions.github = true;
    } else if (arg === "--mcp-docker") {
      mcpOptions.docker = true;
    } else {
      inputArgs.push(arg);
    }
  }

  if (inputArgs.length > 0) {
    userInput = inputArgs.join(" ");
  }

  let agent: import("./agents/coder-agent.js").CoderAgent | undefined;

  try {
    const { CoderAgent } = await import("./agents/coder-agent.js");
    agent = new CoderAgent(skillFileName, mcpOptions, {
      persistMemory,
      includeProjectMap,
      allowUnsafeTerminal,
      sessionId,
      auditEnabled,
    });

    console.log(`[Nexus]: Initializing agent with skill -> ${skillFileName}`);
    await agent.initialize();

    if (useChat) {
      await agent.executeChat();
    } else if (useAutoHeal) {
      await agent.executeAutoHeal(userInput);
    } else if (useWorkflow) {
      await agent.executeWorkflow(userInput);
    } else {
      await agent.executeTask(userInput);
    }
  } catch (error: any) {
    console.error(`[Fatal Error]: ${error.message}`);
  } finally {
    await agent?.shutdown();
  }
}

main().catch(console.error);
