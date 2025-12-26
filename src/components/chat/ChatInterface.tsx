"use client";

import { useEffect, useRef } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/lib/contexts/chat-context";

export function ChatInterface() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, status, error } = useChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full p-4">
      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden pr-4">
        <MessageList messages={messages} isLoading={status === "streaming" || status === "submitted"} />
      </ScrollArea>
      {error && (
        <div className="mx-auto max-w-4xl px-4 py-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-800">
            ⚠️ AI 응답 생성 실패. {error.message}
          </p>
        </div>
      )}
      <div className="mt-4 flex-shrink-0">
        <MessageInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={status !== "ready"}
        />
      </div>
    </div>
  );
}
