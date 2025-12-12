"use server";

import { db } from "@/drizzle";
import { chats } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, desc, and } from "drizzle-orm";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

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
  ``;
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
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system:
          "You are a helpful assistant that generates a short, concise title (max 5 words) for a chat conversation based on the first message.",
        prompt: `Generate a title for this chat message: ${JSON.stringify(messages)}`,
      });
      chatTitle = text.trim();
    } catch (error) {
      console.error("Failed to generate chat title:", error);
      chatTitle = messages[0]?.content.slice(0, 50) || "New Chat";
    }
  }

  if (existingChat) {
    await db
      .update(chats)
      .set({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages as any,
        updatedAt: new Date(),
        ...(chatTitle ? { title: chatTitle } : {}),
      })
      .where(eq(chats.id, id));
  } else {
    await db.insert(chats).values({
      id,
      userId: user.id,
      title: chatTitle || messages[0]?.content.slice(0, 50) || "New Chat",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
    });
  }
}

export async function getChats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  return await db.query.chats.findMany({
    where: eq(chats.userId, user.id),
    orderBy: [desc(chats.createdAt)],
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
