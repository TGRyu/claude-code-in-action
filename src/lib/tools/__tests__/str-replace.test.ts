import { describe, it, expect } from "vitest";
import { buildStrReplaceTool } from "../str-replace";
import { VirtualFileSystem } from "@/lib/file-system";

describe("buildStrReplaceTool", () => {
  it("should build a tool with valid schema", () => {
    const fileSystem = new VirtualFileSystem();
    const tool = buildStrReplaceTool(fileSystem);

    expect(tool).toBeDefined();
    expect(tool.description).toBeDefined();
    expect(tool.parameters).toBeDefined();
  });

  it("should have a parameters schema with type property", () => {
    const fileSystem = new VirtualFileSystem();
    const tool = buildStrReplaceTool(fileSystem);

    // Check if parameters has the necessary structure
    const schema = tool.parameters;
    expect(schema).toBeDefined();

    // Zod schemas should have _def property
    expect(schema).toHaveProperty("_def");

    // Try to parse the schema to JSON Schema
    // This is what AI SDK does internally
    const jsonSchema = (schema as any)._def;
    expect(jsonSchema).toBeDefined();
  });

  it("should execute view command", async () => {
    const fileSystem = new VirtualFileSystem();
    fileSystem.createFileWithParents("/test.txt", "hello world");

    const tool = buildStrReplaceTool(fileSystem);
    const result = await tool.execute({
      command: "view",
      path: "/test.txt",
    });

    expect(result).toContain("hello world");
  });

  it("should execute create command", async () => {
    const fileSystem = new VirtualFileSystem();
    const tool = buildStrReplaceTool(fileSystem);

    const result = await tool.execute({
      command: "create",
      path: "/new.txt",
      file_text: "new content",
    });

    expect(result).toContain("successfully");
    expect(fileSystem.readFile("/new.txt")).toBe("new content");
  });

  it("should execute str_replace command", async () => {
    const fileSystem = new VirtualFileSystem();
    fileSystem.createFileWithParents("/test.txt", "hello world");

    const tool = buildStrReplaceTool(fileSystem);
    const result = await tool.execute({
      command: "str_replace",
      path: "/test.txt",
      old_str: "world",
      new_str: "universe",
    });

    expect(result).toContain("successfully");
    expect(fileSystem.readFile("/test.txt")).toBe("hello universe");
  });

  it("should execute insert command", async () => {
    const fileSystem = new VirtualFileSystem();
    fileSystem.createFileWithParents("/test.txt", "line 1\nline 2");

    const tool = buildStrReplaceTool(fileSystem);
    const result = await tool.execute({
      command: "insert",
      path: "/test.txt",
      insert_line: 1,
      new_str: "inserted line",
    });

    expect(result).toContain("successfully");
    expect(fileSystem.readFile("/test.txt")).toContain("inserted line");
  });
});
