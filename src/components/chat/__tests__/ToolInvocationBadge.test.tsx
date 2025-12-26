import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

vi.mock("lucide-react", () => ({
  Loader2: ({ className }: { className: string }) => (
    <div data-testid="loader" className={className} />
  ),
}));

afterEach(() => {
  cleanup();
});

// A. str_replace_editor Tool Tests

test("Create command displays 'Creating /path/file.tsx' with emerald colors", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor" as const,
    args: { command: "create", path: "/components/Counter.tsx" },
    state: "result" as const,
    result: "Success",
  };

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  expect(screen.getByText("Creating /components/Counter.tsx")).toBeDefined();
  const badge = container.querySelector("div");
  expect(badge?.className).toContain("bg-emerald-50");
  expect(badge?.className).toContain("text-emerald-700");
  expect(badge?.className).toContain("border-emerald-200");
});

test("str_replace command displays 'Editing /path/file.tsx' with blue colors", () => {
  const toolInvocation = {
    toolCallId: "test-2",
    toolName: "str_replace_editor" as const,
    args: { command: "str_replace", path: "/App.tsx" },
    state: "result" as const,
    result: "Success",
  };

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  expect(screen.getByText("Editing /App.tsx")).toBeDefined();
  const badge = container.querySelector("div");
  expect(badge?.className).toContain("bg-blue-50");
  expect(badge?.className).toContain("text-blue-700");
  expect(badge?.className).toContain("border-blue-200");
});

test("insert command displays 'Adding lines to /path/file.tsx' with blue colors", () => {
  const toolInvocation = {
    toolCallId: "test-3",
    toolName: "str_replace_editor" as const,
    args: { command: "insert", path: "/utils/helper.ts" },
    state: "result" as const,
    result: "Success",
  };

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  expect(screen.getByText("Adding lines to /utils/helper.ts")).toBeDefined();
  const badge = container.querySelector("div");
  expect(badge?.className).toContain("bg-blue-50");
  expect(badge?.className).toContain("text-blue-700");
  expect(badge?.className).toContain("border-blue-200");
});

test("view command displays 'Viewing /path/file.tsx' with gray colors", () => {
  const toolInvocation = {
    toolCallId: "test-4",
    toolName: "str_replace_editor" as const,
    args: { command: "view", path: "/styles/main.css" },
    state: "result" as const,
    result: "Success",
  };

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  expect(screen.getByText("Viewing /styles/main.css")).toBeDefined();
  const badge = container.querySelector("div");
  expect(badge?.className).toContain("bg-neutral-50");
  expect(badge?.className).toContain("text-neutral-700");
  expect(badge?.className).toContain("border-neutral-200");
});

test("undo_edit command displays 'Undoing changes to /path/file.tsx' with gray colors", () => {
  const toolInvocation = {
    toolCallId: "test-5",
    toolName: "str_replace_editor" as const,
    args: { command: "undo_edit", path: "/components/Button.tsx" },
    state: "result" as const,
    result: "Success",
  };

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  expect(
    screen.getByText("Undoing changes to /components/Button.tsx")
  ).toBeDefined();
  const badge = container.querySelector("div");
  expect(badge?.className).toContain("bg-neutral-50");
  expect(badge?.className).toContain("text-neutral-700");
  expect(badge?.className).toContain("border-neutral-200");
});

// B. file_manager Tool Tests

test("Rename command displays 'Renaming /old/path → /new/path' with amber colors", () => {
  const toolInvocation = {
    toolCallId: "test-6",
    toolName: "file_manager" as const,
    args: {
      command: "rename",
      path: "/old/Component.tsx",
      new_path: "/new/Component.tsx",
    },
    state: "result" as const,
    result: { success: true },
  };

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  expect(
    screen.getByText("Renaming /old/Component.tsx → /new/Component.tsx")
  ).toBeDefined();
  const badge = container.querySelector("div");
  expect(badge?.className).toContain("bg-amber-50");
  expect(badge?.className).toContain("text-amber-700");
  expect(badge?.className).toContain("border-amber-200");
});

test("Delete command displays 'Deleting /path/file.tsx' with red colors", () => {
  const toolInvocation = {
    toolCallId: "test-7",
    toolName: "file_manager" as const,
    args: { command: "delete", path: "/temp/unused.tsx" },
    state: "result" as const,
    result: { success: true },
  };

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  expect(screen.getByText("Deleting /temp/unused.tsx")).toBeDefined();
  const badge = container.querySelector("div");
  expect(badge?.className).toContain("bg-red-50");
  expect(badge?.className).toContain("text-red-700");
  expect(badge?.className).toContain("border-red-200");
});

// C. State Tests

test("Pending state shows animated spinner with operation-specific color", () => {
  const toolInvocation = {
    toolCallId: "test-8",
    toolName: "str_replace_editor" as const,
    args: { command: "create", path: "/NewFile.tsx" },
    state: "pending" as const,
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  const loader = screen.getByTestId("loader");
  expect(loader).toBeDefined();
  expect(loader.className).toContain("text-emerald-500");
  expect(loader.className).toContain("animate-spin");
});

test("Result state shows green dot indicator", () => {
  const toolInvocation = {
    toolCallId: "test-9",
    toolName: "str_replace_editor" as const,
    args: { command: "create", path: "/File.tsx" },
    state: "result" as const,
    result: "Success",
  };

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  const dot = container.querySelector(".bg-emerald-500");
  expect(dot).toBeDefined();
  expect(dot?.className).toContain("rounded-full");
  expect(screen.queryByTestId("loader")).toBeNull();
});

test("Spinner color matches operation type for edit", () => {
  const toolInvocation = {
    toolCallId: "test-10",
    toolName: "str_replace_editor" as const,
    args: { command: "str_replace", path: "/File.tsx" },
    state: "pending" as const,
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  const loader = screen.getByTestId("loader");
  expect(loader.className).toContain("text-blue-500");
});

test("Spinner color matches operation type for delete", () => {
  const toolInvocation = {
    toolCallId: "test-11",
    toolName: "file_manager" as const,
    args: { command: "delete", path: "/File.tsx" },
    state: "pending" as const,
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  const loader = screen.getByTestId("loader");
  expect(loader.className).toContain("text-red-500");
});

// D. Edge Case Tests

test("Missing args object shows fallback display (tool name)", () => {
  const toolInvocation = {
    toolCallId: "test-12",
    toolName: "str_replace_editor" as const,
    args: {} as any,
    state: "result" as const,
    result: "Success",
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

test("Missing command shows tool name", () => {
  const toolInvocation = {
    toolCallId: "test-13",
    toolName: "file_manager" as const,
    args: { path: "/some/file.tsx" },
    state: "result" as const,
    result: "Success",
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("file_manager")).toBeDefined();
});

test("Missing path shows 'unknown file'", () => {
  const toolInvocation = {
    toolCallId: "test-14",
    toolName: "str_replace_editor" as const,
    args: { command: "create" },
    state: "result" as const,
    result: "Success",
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Creating unknown file")).toBeDefined();
});

test("Missing new_path for rename shows just the original path", () => {
  const toolInvocation = {
    toolCallId: "test-15",
    toolName: "file_manager" as const,
    args: { command: "rename", path: "/old/file.tsx" },
    state: "result" as const,
    result: "Success",
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Renaming /old/file.tsx")).toBeDefined();
});

test("Complex nested directory paths display correctly", () => {
  const toolInvocation = {
    toolCallId: "test-16",
    toolName: "str_replace_editor" as const,
    args: {
      command: "create",
      path: "/src/components/ui/forms/inputs/TextInput.tsx",
    },
    state: "result" as const,
    result: "Success",
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(
    screen.getByText("Creating /src/components/ui/forms/inputs/TextInput.tsx")
  ).toBeDefined();
});

test("Different file extensions display correctly - .jsx", () => {
  const toolInvocation = {
    toolCallId: "test-17",
    toolName: "str_replace_editor" as const,
    args: { command: "create", path: "/App.jsx" },
    state: "result" as const,
    result: "Success",
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("Different file extensions display correctly - .css", () => {
  const toolInvocation = {
    toolCallId: "test-18",
    toolName: "str_replace_editor" as const,
    args: { command: "view", path: "/styles/main.css" },
    state: "result" as const,
    result: "Success",
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Viewing /styles/main.css")).toBeDefined();
});

test("Different file extensions display correctly - .js", () => {
  const toolInvocation = {
    toolCallId: "test-19",
    toolName: "str_replace_editor" as const,
    args: { command: "str_replace", path: "/utils/helper.js" },
    state: "result" as const,
    result: "Success",
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Editing /utils/helper.js")).toBeDefined();
});

// E. Additional Color Class Tests

test("Unknown command defaults to neutral colors", () => {
  const toolInvocation = {
    toolCallId: "test-20",
    toolName: "str_replace_editor" as const,
    args: { command: "unknown_command", path: "/file.tsx" },
    state: "result" as const,
    result: "Success",
  };

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  const badge = container.querySelector("div");
  expect(badge?.className).toContain("bg-neutral-50");
  expect(badge?.className).toContain("text-neutral-700");
  expect(badge?.className).toContain("border-neutral-200");
});

test("Pending state without result shows spinner", () => {
  const toolInvocation = {
    toolCallId: "test-21",
    toolName: "str_replace_editor" as const,
    args: { command: "create", path: "/File.tsx" },
    state: "pending" as const,
  };

  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);

  expect(screen.getByTestId("loader")).toBeDefined();
  expect(screen.queryByRole("status")).toBeNull();
});

test("Result state with result shows green dot", () => {
  const toolInvocation = {
    toolCallId: "test-22",
    toolName: "file_manager" as const,
    args: { command: "delete", path: "/file.tsx" },
    state: "result" as const,
    result: { success: true },
  };

  const { container } = render(
    <ToolInvocationBadge toolInvocation={toolInvocation} />
  );

  const dot = container.querySelector(".bg-emerald-500.rounded-full");
  expect(dot).toBeDefined();
});
