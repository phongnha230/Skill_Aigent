import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";
import { ToolDefinition, ToolManager } from "../tools/tool-manager.js";

export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * McpClient wraps a single MCP server connection.
 * It connects via stdio, fetches available tools, and registers them
 * into the ToolManager as native ToolDefinitions.
 */
export class McpClient {
  private client: Client;
  private transport: StdioClientTransport;
  private config: McpServerConfig;
  private connected = false;

  constructor(config: McpServerConfig) {
    this.config = config;
    this.transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: { ...process.env, ...config.env } as Record<string, string>,
    });
    this.client = new Client(
      { name: `skill-agent-mcp-${config.name}`, version: "1.0.0" },
      { capabilities: {} }
    );
  }

  get name(): string {
    return this.config.name;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    await this.client.connect(this.transport);
    this.connected = true;
    console.log(`[MCP]: Connected to "${this.config.name}" server.`);
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }

  /**
   * Fetches all tools from the MCP server and registers them into the ToolManager.
   */
  async registerTo(toolManager: ToolManager): Promise<void> {
    if (!this.connected) {
      throw new Error(`[MCP]: Not connected to "${this.config.name}". Call connect() first.`);
    }

    const { tools } = await this.client.listTools();
    console.log(`[MCP]: Found ${tools.length} tool(s) from "${this.config.name}": ${tools.map(t => t.name).join(", ")}`);

    for (const mcpTool of tools) {
      const toolDefinition: ToolDefinition = {
        name: mcpTool.name,
        description: mcpTool.description ?? `Tool from MCP server: ${this.config.name}`,
        // Use a passthrough Zod schema; actual validation is done by the MCP server.
        parameters: z.object({}).passthrough(),
        execute: async (args: any) => {
          const result = await this.client.callTool({
            name: mcpTool.name,
            arguments: args,
          });
          // Flatten MCP content response to a simple string for the LLM.
          const content = result.content as any[];
          const text = content
            .map((c: any) => (c.type === "text" ? c.text : JSON.stringify(c)))
            .join("\n");
          return text;
        },
      };
      toolManager.registerTool(toolDefinition);
    }
  }
}
