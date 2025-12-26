import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { VirtualFileSystem } from "@/lib/file-system";

// Anthropic tool schema format
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

// Tool execution function type
export type ToolExecutor = (args: any) => Promise<string>;

/**
 * Converts a zod schema to Anthropic-compatible tool format (no $ref)
 */
function zodToAnthropicSchema(schema: z.ZodTypeAny): any {
  const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: "none",
  });

  // Remove $schema field if present
  const { $schema, ...rest } = jsonSchema as any;
  return rest;
}

/**
 * Builds Anthropic-compatible tool definitions
 */
export function buildAnthropicTools(fileSystem: VirtualFileSystem): {
  tools: AnthropicTool[];
  executors: Record<string, ToolExecutor>;
} {
  const strReplaceSchema = z.object({
    command: z.enum(["view", "create", "str_replace", "insert", "undo_edit"])
      .describe("The command to execute: view, create, str_replace, insert, or undo_edit"),
    path: z.string()
      .describe("The file path to operate on"),
    file_text: z.string().optional()
      .describe("The content of the file (for create command)"),
    insert_line: z.number().optional()
      .describe("The line number to insert text at (for insert command)"),
    new_str: z.string().optional()
      .describe("The new string to replace or insert"),
    old_str: z.string().optional()
      .describe("The old string to replace (for str_replace command)"),
    view_range: z.array(z.number()).optional()
      .describe("The line range to view [start, end] (for view command)"),
  });

  const fileManagerSchema = z.object({
    command: z
      .enum(["rename", "delete"])
      .describe("The operation to perform"),
    path: z
      .string()
      .describe("The path to the file or directory to rename or delete"),
    new_path: z
      .string()
      .optional()
      .describe("The new path. Only provide when renaming or moving a file."),
  });

  const tools: AnthropicTool[] = [
    {
      name: "str_replace_editor",
      description: 'A text editor tool for viewing and editing files in the virtual file system. Supports viewing file contents, creating new files, replacing strings, inserting text at specific lines, and more.',
      input_schema: zodToAnthropicSchema(strReplaceSchema),
    },
    {
      name: "file_manager",
      description: 'Rename or delete files or folders in the file system. Rename can be used to "move" a file. Rename will recursively create folders as required.',
      input_schema: zodToAnthropicSchema(fileManagerSchema),
    },
  ];

  const executors: Record<string, ToolExecutor> = {
    str_replace_editor: async (args) => {
      const { command, path, file_text, insert_line, new_str, old_str, view_range } = args;

      switch (command) {
        case "view":
          return fileSystem.viewFile(path, view_range as [number, number] | undefined);

        case "create":
          return fileSystem.createFileWithParents(path, file_text || "");

        case "str_replace":
          return fileSystem.replaceInFile(path, old_str || "", new_str || "");

        case "insert":
          return fileSystem.insertInFile(path, insert_line || 0, new_str || "");

        case "undo_edit":
          return `Error: undo_edit command is not supported in this version. Use str_replace to revert changes.`;

        default:
          return `Error: Unknown command ${command}`;
      }
    },

    file_manager: async (args) => {
      const { command, path, new_path } = args;

      if (command === "rename") {
        if (!new_path) {
          return JSON.stringify({
            success: false,
            error: "new_path is required for rename command",
          });
        }
        const success = fileSystem.rename(path, new_path);
        if (success) {
          return JSON.stringify({
            success: true,
            message: `Successfully renamed ${path} to ${new_path}`,
          });
        } else {
          return JSON.stringify({
            success: false,
            error: `Failed to rename ${path} to ${new_path}`,
          });
        }
      } else if (command === "delete") {
        const success = fileSystem.deleteFile(path);
        if (success) {
          return JSON.stringify({ success: true, message: `Successfully deleted ${path}` });
        } else {
          return JSON.stringify({ success: false, error: `Failed to delete ${path}` });
        }
      }

      return JSON.stringify({ success: false, error: "Invalid command" });
    },
  };

  return { tools, executors };
}
