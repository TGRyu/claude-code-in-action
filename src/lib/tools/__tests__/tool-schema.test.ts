import { describe, it, expect } from "vitest";
import { buildStrReplaceTool } from "../str-replace";
import { buildFileManagerTool } from "../file-manager";
import { VirtualFileSystem } from "@/lib/file-system";
import { zodToJsonSchema } from "zod-to-json-schema";

describe("Tool Schema Conversion", () => {
  it("should have parameters with type field in JSON Schema (no $ref)", () => {
    const fileSystem = new VirtualFileSystem();
    const tool = buildStrReplaceTool(fileSystem);

    // Convert zod schema to JSON Schema WITHOUT $ref (required by Anthropic)
    const jsonSchema = zodToJsonSchema(tool.parameters, {
      $refStrategy: "none"
    });

    console.log("str_replace JSON Schema:", JSON.stringify(jsonSchema, null, 2));

    // Check that the schema has the required type field at root level
    expect(jsonSchema).toBeDefined();
    expect(jsonSchema).toHaveProperty("type");
    expect(jsonSchema.type).toBe("object");
    expect(jsonSchema).toHaveProperty("properties");
    // Should NOT have $ref at root
    expect(jsonSchema).not.toHaveProperty("$ref");
  });

  it("should have file_manager parameters with type field in JSON Schema (no $ref)", () => {
    const fileSystem = new VirtualFileSystem();
    const tool = buildFileManagerTool(fileSystem);

    const jsonSchema = zodToJsonSchema(tool.parameters, {
      $refStrategy: "none"
    });

    console.log("file_manager JSON Schema:", JSON.stringify(jsonSchema, null, 2));

    expect(jsonSchema).toBeDefined();
    expect(jsonSchema).toHaveProperty("type");
    expect(jsonSchema.type).toBe("object");
    expect(jsonSchema).toHaveProperty("properties");
    expect(jsonSchema).not.toHaveProperty("$ref");
  });

  it("should validate str_replace tool structure matches Anthropic requirements", () => {
    const fileSystem = new VirtualFileSystem();
    const tool = buildStrReplaceTool(fileSystem);

    // Simulate what Anthropic expects
    const anthropicFormat = {
      name: "str_replace_editor",
      description: tool.description,
      input_schema: zodToJsonSchema(tool.parameters, {
        $refStrategy: "none"
      }),
    };

    console.log("Anthropic format:", JSON.stringify(anthropicFormat, null, 2));

    // Verify all required fields are present
    expect(anthropicFormat.name).toBeDefined();
    expect(anthropicFormat.description).toBeDefined();
    expect(anthropicFormat.input_schema).toBeDefined();
    expect(anthropicFormat.input_schema.type).toBe("object");
    expect(anthropicFormat.input_schema).not.toHaveProperty("$ref");
  });
});
