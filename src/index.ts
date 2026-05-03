#!/usr/bin/env -S node --loader ts-node/esm
import { CoderAgent, McpOptions } from "./agents/coder-agent.js";

async function main() {
  const args = process.argv.slice(2);
  let skillFileName = "coding-assistant.md";
  let userInput = "Hello! Tell me who you are and what you can do.";
  let useWorkflow = false;
  const mcpOptions: McpOptions = {};

  const inputArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg === "--skill" && i + 1 < args.length) {
      const skillArg = args[++i] as string;
      skillFileName = skillArg.endsWith(".md") ? skillArg : `${skillArg}.md`;
    } else if (arg === "--workflow") {
      useWorkflow = true;
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

  const agent = new CoderAgent(skillFileName, mcpOptions);

  try {
    console.log(`[Nexus]: Initializing agent with skill -> ${skillFileName}`);
    await agent.initialize();

    if (useWorkflow) {
      await agent.executeWorkflow(userInput);
    } else {
      await agent.executeTask(userInput);
    }
  } catch (error: any) {
    console.error(`[Fatal Error]: ${error.message}`);
  } finally {
    await agent.shutdown();
  }
}

main().catch(console.error);
