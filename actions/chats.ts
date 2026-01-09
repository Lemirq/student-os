"use server";

import { db } from "@/drizzle";
import { chats } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, desc, and } from "drizzle-orm";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, LanguageModel } from "ai";
import { openRouterApiKey } from "@/lib/env";

const openRouterClient = createOpenRouter({
  apiKey: openRouterApiKey,
});

const glm = openRouterClient.chat("z-ai/glm-4.7") as LanguageModel;

export async function saveChat({
  id,
  messages,
  title,
}: {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[];
  title?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const existingChat = await db.query.chats.findFirst({
    where: and(eq(chats.id, id), eq(chats.userId, user.id)),
  });

  let chatTitle = title;

  if (!chatTitle && !existingChat && messages.length > 0) {
    try {
      const firstMessage = messages[0];
      const firstContent =
        firstMessage?.content ||
        (firstMessage?.parts?.[0]?.type === "text"
          ? firstMessage.parts[0].text
          : null);

      const contentString = firstContent
        ? typeof firstContent === "string"
          ? firstContent.slice(0, 500)
          : JSON.stringify(firstContent).slice(0, 500)
        : "";

      const { text } = await generateText({
        model: glm,
        system:
          "You are a helpful assistant that generates a short, concise title (max 5 words) for a chat conversation based on the first message.",
        prompt: `Generate a title for this chat message: ${contentString}`,
        temperature: 0.7,
      });

      chatTitle = text.trim().slice(0, 50);
    } catch (error) {
      console.error(error);
      const firstMessage = messages[0];
      const firstContent =
        firstMessage?.content ||
        (firstMessage?.parts?.[0]?.type === "text"
          ? firstMessage.parts[0].text
          : null);
      chatTitle = firstContent
        ? typeof firstContent === "string"
          ? firstContent.slice(0, 50)
          : "New Chat"
        : "New Chat";
    }
  }

  const firstMessage = messages[0];
  const defaultMessageContent =
    firstMessage?.content ||
    (firstMessage?.parts?.[0]?.type === "text"
      ? firstMessage.parts[0].text
      : null);
  const defaultTitle =
    typeof defaultMessageContent === "string"
      ? defaultMessageContent.slice(0, 50)
      : "New Chat";

  await db
    .insert(chats)
    .values({
      id,
      userId: user.id,
      title: chatTitle || defaultTitle,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
    })
    .onConflictDoUpdate({
      target: chats.id,
      set: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages as any,
        updatedAt: new Date(),
        ...(chatTitle ? { title: chatTitle } : {}),
      },
    });

  // Invalidate cache for chats table
  await db.$cache.invalidate({ tables: [chats] });
}

export async function getChats(limitValue?: number, offsetValue?: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  return await db.query.chats.findMany({
    where: eq(chats.userId, user.id),
    orderBy: [desc(chats.updatedAt)],
    limit: limitValue,
    offset: offsetValue,
  });
}

export async function deleteChat(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(chats)
    .where(and(eq(chats.id, id), eq(chats.userId, user.id)));

  // Invalidate cache for chats table
  await db.$cache.invalidate({ tables: [chats] });
}

export async function getChat(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return await db.query.chats.findFirst({
    where: and(eq(chats.id, id), eq(chats.userId, user.id)),
  });
}
