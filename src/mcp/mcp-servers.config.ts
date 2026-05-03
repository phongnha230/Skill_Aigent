import { McpServerConfig } from "../mcp/mcp-client.js";

/**
 * Pre-defined MCP server configurations.
 * Pass the required env variables at runtime or via .env
 */

export function postgresConfig(connectionString: string): McpServerConfig {
  return {
    name: "postgres",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres", connectionString],
  };
}

export function mysqlConfig(opts: {
  host: string;
  port?: string;
  user: string;
  password: string;
  database: string;
}): McpServerConfig {
  return {
    name: "mysql",
    command: "npx",
    args: ["-y", "@benborla29/mcp-server-mysql"],
    env: {
      MYSQL_HOST: opts.host,
      MYSQL_PORT: opts.port ?? "3306",
      MYSQL_USER: opts.user,
      MYSQL_PASS: opts.password,
      MYSQL_DB: opts.database,
    },
  };
}

export function mongoConfig(uri: string): McpServerConfig {
  return {
    name: "mongodb",
    command: "npx",
    args: ["-y", "mcp-mongo-server", uri],
  };
}

export function githubConfig(token: string): McpServerConfig {
  return {
    name: "github",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: token,
    },
  };
}

export function dockerConfig(): McpServerConfig {
  return {
    name: "docker",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-docker"],
  };
}
