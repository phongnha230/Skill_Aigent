import { Orchestrator } from "../core/engine.js";
import { MemoryStore } from "../core/memory-store.js";
import { ProjectMapper } from "../core/project-mapper.js";
import { ToolManager } from "../tools/tool-manager.js";
import { listFilesTool, searchCodeTool } from "../tools/code-search.tool.js";
import { writeFileTool, readFileTool } from "../tools/file-system.tool.js";
import { terminalTool } from "../tools/terminal.tool.js";
import { OpenAIProvider } from "../providers/openai.provider.js";
import { AutoHealingWorkflow } from "../workflows/auto-healing.workflow.js";
import { SoftwareDevelopmentWorkflow } from "../workflows/software-development.workflow.js";
import { McpRegistry } from "../mcp/mcp-registry.js";
import {
  postgresConfig,
  mysqlConfig,
  mongoConfig,
  githubConfig,
  dockerConfig,
} from "../mcp/mcp-servers.config.js";
import { env } from "../config/env.js";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

export interface McpOptions {
  postgres?: boolean;
  mysql?: boolean;
  mongodb?: boolean;
  github?: boolean;
  docker?: boolean;
}

export interface CoderAgentOptions {
  persistMemory?: boolean;
  includeProjectMap?: boolean;
}

/**
 * CoderAgent: A specialized Agent for software development.
 * Supports pluggable MCP servers for database, GitHub, Docker, etc.
 */
export class CoderAgent {
  private orchestrator!: Orchestrator;
  private mcpRegistry: McpRegistry = new McpRegistry();
  private skillFileName: string;
  private mcpOptions: McpOptions;
  private options: Required<CoderAgentOptions>;
  private memoryStore: MemoryStore | undefined;

  constructor(skillFileName: string, mcpOptions: McpOptions = {}, options: CoderAgentOptions = {}) {
    this.skillFileName = skillFileName;
    this.mcpOptions = mcpOptions;
    this.options = {
      persistMemory: options.persistMemory ?? true,
      includeProjectMap: options.includeProjectMap ?? true,
    };
  }

  /**
   * Must be called before executeTask().
   * Connects to all enabled MCP servers and initializes the Orchestrator.
   */
  async initialize(): Promise<void> {
    const toolManager = new ToolManager();

    // 1. Register built-in tools
    toolManager.registerTool(listFilesTool);
    toolManager.registerTool(searchCodeTool);
    toolManager.registerTool(writeFileTool);
    toolManager.registerTool(readFileTool);
    toolManager.registerTool(terminalTool);

    // 2. Register MCP servers based on options
    if (this.mcpOptions.postgres && env.POSTGRES_CONNECTION_STRING) {
      this.mcpRegistry.addServer(postgresConfig(env.POSTGRES_CONNECTION_STRING));
    }
    if (this.mcpOptions.mysql && env.MYSQL_HOST && env.MYSQL_USER && env.MYSQL_PASSWORD && env.MYSQL_DATABASE) {
      const mysqlOpts: { host: string; port?: string; user: string; password: string; database: string } = {
        host: env.MYSQL_HOST,
        user: env.MYSQL_USER,
        password: env.MYSQL_PASSWORD,
        database: env.MYSQL_DATABASE,
      };
      if (env.MYSQL_PORT) mysqlOpts.port = env.MYSQL_PORT;
      this.mcpRegistry.addServer(mysqlConfig(mysqlOpts));
    }
    if (this.mcpOptions.mongodb && env.MONGODB_URI) {
      this.mcpRegistry.addServer(mongoConfig(env.MONGODB_URI));
    }
    if (this.mcpOptions.github && env.GITHUB_PERSONAL_ACCESS_TOKEN) {
      this.mcpRegistry.addServer(githubConfig(env.GITHUB_PERSONAL_ACCESS_TOKEN));
    }
    if (this.mcpOptions.docker) {
      this.mcpRegistry.addServer(dockerConfig());
    }

    // 3. Connect all MCP servers and inject their tools
    await this.mcpRegistry.connectAll();
    await this.mcpRegistry.registerAll(toolManager);

    // 4. Load Skill
    const skillPath = path.resolve(process.cwd(), "skills", this.skillFileName);
    if (!fs.existsSync(skillPath)) {
      throw new Error(`Skill file not found at ${skillPath}`);
    }
    const skillPrompt = fs.readFileSync(skillPath, "utf8");
    const projectMap = this.options.includeProjectMap ? new ProjectMapper().buildSummary() : "";
    const systemPrompt = projectMap ? `${skillPrompt}\n\n---\n\n${projectMap}` : skillPrompt;

    // 5. Initialize Provider + Orchestrator
    const provider = new OpenAIProvider();
    this.memoryStore = this.options.persistMemory ? new MemoryStore() : undefined;
    this.orchestrator = new Orchestrator(systemPrompt, toolManager, provider, this.memoryStore);

    console.log(`[Nexus]: Ready with ${this.skillFileName}\n`);
    if (this.memoryStore) {
      console.log(`[Nexus]: Memory file -> ${this.memoryStore.filePath}\n`);
    }
  }

  async executeTask(task: string): Promise<void> {
    if (!this.orchestrator) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }
    console.log(`\n[Nexus]: Starting task...`);
    await this.orchestrator.run(task);
  }

  async executeChat(): Promise<void> {
    if (!this.orchestrator) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    const rl = readline.createInterface({ input, output });
    console.log("[Nexus]: Chat mode started. Type /exit to quit, /clear to reset memory.");

    try {
      while (true) {
        const answer = (await rl.question("\nYou> ")).trim();
        if (!answer) {
          continue;
        }

        if (answer === "/exit" || answer === "/quit") {
          break;
        }

        if (answer === "/clear") {
          this.clearMemory();
          console.log("[Nexus]: Memory cleared.");
          continue;
        }

        await this.orchestrator.run(answer);
      }
    } finally {
      rl.close();
    }
  }

  async executeWorkflow(task: string): Promise<void> {
    if (!this.orchestrator) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }
    const workflow = new SoftwareDevelopmentWorkflow(this.orchestrator);
    await workflow.execute(task);
  }

  async executeAutoHeal(task: string): Promise<void> {
    if (!this.orchestrator) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }
    const workflow = new AutoHealingWorkflow(this.orchestrator);
    await workflow.execute(task);
  }

  async shutdown(): Promise<void> {
    await this.mcpRegistry.disconnectAll();
  }

  clearMemory(): void {
    if (!this.orchestrator) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }
    this.orchestrator.clearMemory();
  }
}
