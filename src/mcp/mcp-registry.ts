import { McpClient, McpServerConfig } from "./mcp-client.js";
import { ToolManager } from "../tools/tool-manager.js";

/**
 * McpRegistry manages multiple MCP server connections.
 * It provides a clean way to register many MCP servers at once
 * and inject all their tools into the ToolManager.
 */
export class McpRegistry {
  private clients: McpClient[] = [];

  addServer(config: McpServerConfig): this {
    this.clients.push(new McpClient(config));
    return this; // Fluent API for chaining
  }

  async connectAll(): Promise<void> {
    console.log(`[MCP Registry]: Connecting to ${this.clients.length} server(s)...`);
    await Promise.all(
      this.clients.map(async client => {
        try {
          await client.connect();
        } catch (error: any) {
          console.warn(`[MCP Registry]: Failed to connect "${client.name}". Continuing without it. ${error.message}`);
        }
      })
    );
  }

  async registerAll(toolManager: ToolManager): Promise<void> {
    for (const client of this.clients) {
      if (!client.isConnected) {
        continue;
      }
      await client.registerTo(toolManager);
    }
  }

  async disconnectAll(): Promise<void> {
    await Promise.all(this.clients.map(c => c.disconnect()));
    console.log(`[MCP Registry]: All servers disconnected.`);
  }
}
