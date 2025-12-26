import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolInvocationBadgeProps {
  toolInvocation: {
    toolCallId: string;
    toolName: "str_replace_editor" | "file_manager";
    args: {
      command?: string;
      path?: string;
      new_path?: string;
      [key: string]: any;
    };
    state: "pending" | "result";
    result?: any;
  };
}

function getOperationText(
  toolName: string,
  args: Record<string, any>
): string {
  if (!args || !args.command) {
    return toolName;
  }

  const { command, path, new_path } = args;
  const filePath = path || "unknown file";

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return `Creating ${filePath}`;
      case "str_replace":
        return `Editing ${filePath}`;
      case "insert":
        return `Adding lines to ${filePath}`;
      case "view":
        return `Viewing ${filePath}`;
      case "undo_edit":
        return `Undoing changes to ${filePath}`;
      default:
        return toolName;
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return new_path
          ? `Renaming ${filePath} → ${new_path}`
          : `Renaming ${filePath}`;
      case "delete":
        return `Deleting ${filePath}`;
      default:
        return toolName;
    }
  }

  return toolName;
}

function getColorClasses(toolName: string, command?: string): string {
  if (!command) {
    return "bg-neutral-50 text-neutral-700 border-neutral-200";
  }

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "str_replace":
      case "insert":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "view":
      case "undo_edit":
        return "bg-neutral-50 text-neutral-700 border-neutral-200";
      default:
        return "bg-neutral-50 text-neutral-700 border-neutral-200";
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "delete":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-neutral-50 text-neutral-700 border-neutral-200";
    }
  }

  return "bg-neutral-50 text-neutral-700 border-neutral-200";
}

function getSpinnerColor(toolName: string, command?: string): string {
  if (!command) {
    return "text-neutral-500";
  }

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return "text-emerald-500";
      case "str_replace":
      case "insert":
        return "text-blue-500";
      case "view":
      case "undo_edit":
        return "text-neutral-500";
      default:
        return "text-neutral-500";
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return "text-amber-500";
      case "delete":
        return "text-red-500";
      default:
        return "text-neutral-500";
    }
  }

  return "text-neutral-500";
}

export function ToolInvocationBadge({
  toolInvocation,
}: ToolInvocationBadgeProps) {
  const { toolName, args, state, result } = toolInvocation;
  const operationText = getOperationText(toolName, args || {});
  const colorClasses = getColorClasses(toolName, args?.command);
  const spinnerColor = getSpinnerColor(toolName, args?.command);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs font-mono border",
        colorClasses
      )}
    >
      {state === "result" && result ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className={cn("w-3 h-3 animate-spin", spinnerColor)} />
      )}
      <span>{operationText}</span>
    </div>
  );
}
