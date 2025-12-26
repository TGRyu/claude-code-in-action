import { tool } from "ai";
import { z } from "zod";
import { VirtualFileSystem } from "@/lib/file-system";
import { zodToJsonSchema } from "zod-to-json-schema";

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

export function buildStrReplaceTool(fileSystem: VirtualFileSystem) {
  return tool({
    description: 'A text editor tool for viewing and editing files in the virtual file system. Supports viewing file contents, creating new files, replacing strings, inserting text at specific lines, and more.',
    parameters: strReplaceSchema,
    execute: async ({
      command,
      path,
      file_text,
      insert_line,
      new_str,
      old_str,
      view_range,
    }) => {
      switch (command) {
        case "view":
          return fileSystem.viewFile(
            path,
            view_range as [number, number] | undefined
          );

        case "create":
          return fileSystem.createFileWithParents(path, file_text || "");

        case "str_replace":
          return fileSystem.replaceInFile(path, old_str || "", new_str || "");

        case "insert":
          return fileSystem.insertInFile(path, insert_line || 0, new_str || "");

        case "undo_edit":
          return `Error: undo_edit command is not supported in this version. Use str_replace to revert changes.`;
      }
    },
  });
}
