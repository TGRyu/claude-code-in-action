"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function stringifyChildren(children: any): string {
  if (typeof children === 'string') {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(stringifyChildren).join('');
  }
  if (children && typeof children === 'object') {
    return String(children);
  }
  return String(children || '');
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn("prose leading-tight max-w-none", className)}>
      <ReactMarkdown
        components={{
          code: ({ children, className, ...props }) => {
            const childrenText = stringifyChildren(children);
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;

            if (isInline) {
              return (
                <code
                  className="not-prose text-sm px-1 py-0.5 rounded-sm bg-neutral-100 text-neutral-900 font-mono"
                  {...props}
                >
                  {childrenText}
                </code>
              );
            }
            return (
              <code className={cn("", className)} {...props}>
                {childrenText}
              </code>
            );
          },
          p: ({ children, ...props }) => {
            return <p {...props}>{stringifyChildren(children)}</p>;
          },
          strong: ({ children, ...props }) => {
            return <strong {...props}>{stringifyChildren(children)}</strong>;
          },
          em: ({ children, ...props }) => {
            return <em {...props}>{stringifyChildren(children)}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
