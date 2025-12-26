import Anthropic from "@anthropic-ai/sdk";
import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { buildAnthropicTools } from "@/lib/tools/anthropic-tools";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generationPrompt } from "@/lib/prompts/generation";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  console.log('\n[CHAT ANTHROPIC API] ==================== Request Start ====================');
  console.log('[CHAT ANTHROPIC API] Timestamp:', new Date().toISOString());

  const {
    messages,
    files,
    projectId,
  }: { messages: any[]; files?: Record<string, FileNode>; projectId?: string } =
    await req.json();

  console.log('[CHAT ANTHROPIC API] Messages count:', messages?.length);
  console.log('[CHAT ANTHROPIC API] Files count:', files ? Object.keys(files).length : 0);

  // Reconstruct the VirtualFileSystem from serialized data
  const fileSystem = new VirtualFileSystem();
  if (files && typeof files === 'object' && Object.keys(files).length > 0) {
    try {
      fileSystem.deserializeFromNodes(files);
    } catch (error) {
      console.error("Failed to deserialize files:", error);
    }
  }

  // Build Anthropic-compatible tools
  const { tools, executors } = buildAnthropicTools(fileSystem);

  console.log('[CHAT ANTHROPIC API] Tools:', tools.map(t => ({ name: t.name, schemaType: t.input_schema.type })));

  // Convert messages to Anthropic format and filter out empty messages
  const anthropicMessages = messages
    .filter((msg: any) => msg.content && String(msg.content).trim() !== '')
    .map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));

  try {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = "";
          const allMessages: any[] = [...anthropicMessages];

          // Track simple messages for UI display (separate from Anthropic format)
          const simpleMessages: any[] = messages
            .filter((m: any) => m.content && String(m.content).trim() !== '')
            .map((m: any) => ({
              role: m.role,
              content: m.content,
            }));

          // Agentic loop with tool use
          let continueLoop = true;
          let maxIterations = 40;
          let iteration = 0;

          while (continueLoop && iteration < maxIterations) {
            iteration++;
            console.log(`[CHAT ANTHROPIC API] Iteration ${iteration}`);

            const response = await anthropic.messages.create({
              model: "claude-3-5-haiku-latest",
              max_tokens: 8192,
              system: generationPrompt,
              messages: allMessages,
              tools: tools,
              stream: false, // We'll handle streaming manually
            });

            console.log('[CHAT ANTHROPIC API] Response stop_reason:', response.stop_reason);

            // Process response content
            for (const block of response.content) {
              if (block.type === "text") {
                const text = block.text;
                fullResponse += text;

                // Send text chunk to client
                const chunk = `0:"${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`;
                controller.enqueue(encoder.encode(chunk));
              } else if (block.type === "tool_use") {
                console.log('[CHAT ANTHROPIC API] Tool use:', block.name);

                // Execute tool
                const executor = executors[block.name];
                if (executor) {
                  try {
                    const result = await executor(block.input);
                    console.log('[CHAT ANTHROPIC API] Tool result length:', result.length);

                    // Add assistant message with tool use
                    allMessages.push({
                      role: "assistant",
                      content: response.content,
                    });

                    // Add tool result
                    allMessages.push({
                      role: "user",
                      content: [
                        {
                          type: "tool_result",
                          tool_use_id: block.id,
                          content: result,
                        },
                      ],
                    });

                    // Continue loop for next iteration
                    continueLoop = true;
                    break; // Break from content loop to start next iteration
                  } catch (error) {
                    console.error('[CHAT ANTHROPIC API] Tool execution error:', error);
                    controller.enqueue(encoder.encode(`0:"Error executing tool: ${error}"\n`));
                    continueLoop = false;
                  }
                } else {
                  console.error('[CHAT ANTHROPIC API] Unknown tool:', block.name);
                  continueLoop = false;
                }
              }
            }

            // If no tool use, we're done
            if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
              continueLoop = false;
            }
          }

          // Add assistant response to simple messages
          if (fullResponse) {
            simpleMessages.push({
              role: "assistant",
              content: fullResponse,
            });
          }

          // Save to project if needed
          if (projectId) {
            try {
              const session = await getSession();
              if (session) {
                await prisma.project.update({
                  where: {
                    id: projectId,
                    userId: session.userId,
                  },
                  data: {
                    messages: JSON.stringify(simpleMessages),
                    data: JSON.stringify(fileSystem.serialize()),
                  },
                });
              }
            } catch (error) {
              console.error("Failed to save project data:", error);
            }
          }

          // Send file system updates to client
          const filesData = JSON.stringify(fileSystem.serialize());
          const filesChunk = `1:${filesData}\n`;
          controller.enqueue(encoder.encode(filesChunk));

          controller.close();
          console.log('[CHAT ANTHROPIC API] ==================== Request End ====================\n');
        } catch (error) {
          console.error('[CHAT ANTHROPIC API] Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("=== Error creating Anthropic stream ===");
    console.error(error);

    return new Response(
      JSON.stringify({
        error: "Failed to generate AI response.",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export const maxDuration = 120;
