"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function convertAnthropicMessagesToSimple(messages: any[]): any[] {
  return messages.map((msg) => {
    // If message.content is already a string, it's in simple format
    if (typeof msg.content === 'string') {
      return {
        role: msg.role,
        content: msg.content,
      };
    }

    // If message.content is an array (Anthropic format), extract text
    if (Array.isArray(msg.content)) {
      const textContent = msg.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      return {
        role: msg.role,
        content: textContent,
      };
    }

    // Default case
    return {
      role: msg.role,
      content: '',
    };
  })
  .filter((msg) => (msg.role === 'user' || msg.role === 'assistant') && msg.content.trim() !== '');
}

export async function getProject(projectId: string) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId: session.userId,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const parsedMessages = JSON.parse(project.messages);
  const simpleMessages = convertAnthropicMessagesToSimple(parsedMessages);

  return {
    id: project.id,
    name: project.name,
    messages: simpleMessages,
    data: JSON.parse(project.data),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}