import { toJSONSchema, z } from "zod";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  execute: (args: any) => Promise<any>;
}

export interface ToolCallDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class ToolManager {
  private tools: Map<string, ToolDefinition> = new Map();

  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  getToolDefinitions(): ToolCallDefinition[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.zodToJSONSchema(tool.parameters),
      },
    }));
  }

  async executeTool(name: string, args: string): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} not found`);

    try {
      const parsedArgs = JSON.parse(args);
      const validatedArgs = tool.parameters.parse(parsedArgs);
      const result = await tool.execute(validatedArgs);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  }

  private zodToJSONSchema(schema: z.ZodObject<any>): Record<string, unknown> {
    const jsonSchema = toJSONSchema(schema, {
      target: "draft-07",
      io: "input",
      unrepresentable: "any",
    }) as Record<string, unknown>;

    delete jsonSchema.$schema;
    return jsonSchema;
  }
}
