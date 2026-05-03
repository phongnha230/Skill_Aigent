import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { ToolDefinition, ToolManager } from "../src/tools/tool-manager.js";

test("ToolManager exposes valid OpenAI tool schema from Zod parameters", () => {
  const tool: ToolDefinition = {
    name: "sample_tool",
    description: "A sample tool",
    parameters: z.object({
      name: z.string(),
      count: z.number().optional(),
      enabled: z.boolean(),
    }),
    execute: async args => args,
  };

  const manager = new ToolManager();
  manager.registerTool(tool);

  const [definition] = manager.getToolDefinitions();

  assert.equal(definition?.type, "function");
  assert.equal(definition?.function.name, "sample_tool");
  assert.equal(definition?.function.description, "A sample tool");

  const parameters = definition?.function.parameters as any;
  assert.equal(parameters.type, "object");
  assert.deepEqual(parameters.required, ["name", "enabled"]);
  assert.equal(parameters.properties.name.type, "string");
  assert.equal(parameters.properties.count.type, "number");
  assert.equal(parameters.properties.enabled.type, "boolean");
});

test("ToolManager validates JSON arguments before executing a tool", async () => {
  const tool: ToolDefinition = {
    name: "echo_count",
    description: "Echoes count",
    parameters: z.object({
      count: z.number(),
    }),
    execute: async ({ count }) => ({ doubled: count * 2 }),
  };

  const manager = new ToolManager();
  manager.registerTool(tool);

  const success = await manager.executeTool("echo_count", JSON.stringify({ count: 4 }));
  assert.deepEqual(JSON.parse(success), { doubled: 8 });

  const failure = await manager.executeTool("echo_count", JSON.stringify({ count: "4" }));
  assert.match(JSON.parse(failure).error, /Invalid input|Expected number/i);
});

test("ToolManager reports unknown tools", async () => {
  const manager = new ToolManager();

  await assert.rejects(
    () => manager.executeTool("missing_tool", "{}"),
    /Tool missing_tool not found/
  );
});
