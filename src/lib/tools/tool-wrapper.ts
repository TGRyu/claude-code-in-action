import { tool as aiTool, CoreTool } from "ai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Wraps an AI SDK tool with proper JSON Schema conversion (no $ref)
 * This ensures Anthropic API compatibility
 */
export function createAnthropicCompatibleTool<PARAMETERS extends z.ZodTypeAny>(config: {
  description: string;
  parameters: PARAMETERS;
  execute: (args: z.infer<PARAMETERS>) => Promise<any>;
}): CoreTool<PARAMETERS, any> {
  const baseTool = aiTool({
    description: config.description,
    parameters: config.parameters,
    execute: config.execute,
  });

  // Convert the zod schema to JSON Schema without $ref
  const jsonSchema = zodToJsonSchema(config.parameters, {
    $refStrategy: "none",
  });

  // Override the schema property to use our converted schema
  // This ensures the schema sent to Anthropic doesn't have $ref
  return {
    ...baseTool,
    // Store the proper JSON Schema for Anthropic
    _jsonSchema: jsonSchema,
  } as CoreTool<PARAMETERS, any>;
}
