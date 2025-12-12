import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  tool,
  generateObject,
  UIMessage,
  UIDataTypes,
  ModelMessage,
} from "ai";
import { z } from "zod";
import { db } from "@/drizzle";
import { tasks } from "@/schema";
import { eq, and, ilike, gte, lte } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 30;

// Define message types
type IncomingMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
};

// Define the structured data types for our tools
type SyllabusData = {
  course: string;
  tasks: Array<{
    title: string;
    weight: number;
    due_date: string;
    type: string;
  }>;
};

type TaskData = {
  id: string;
  title: string;
  dueDate: Date | null;
  scoreReceived: string | null;
  status: string | null;
};

export type StudentOSToolCallsMessage = UIMessage<
  never,
  UIDataTypes,
  {
    showSyllabus: {
      input: {
        data: SyllabusData;
      };
      output: string;
    };
    showSchedule: {
      input: {
        tasks: TaskData[]; // Using any[] here to avoid Date serialization issues in types, actual data will be JSON
        startDate: string;
        endDate: string;
      };
      output: string;
    };
    showTaskUpdate: {
      input: {
        taskName: string;
        score: number;
        status: string;
      };
      output: string;
    };
  }
>;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Ensure messages is an array before using it
  console.log("Received messages:", JSON.stringify(messages, null, 2));

  let coreMessages = [] as ModelMessage[];
  try {
    coreMessages = Array.isArray(messages)
      ? convertToModelMessages(messages)
      : [];
  } catch (error) {
    console.error("Error converting messages:", error);
    // Fallback: simple mapping for text-only messages to unblock basic chat
    if (Array.isArray(messages)) {
      coreMessages = messages.map((m: IncomingMessage) => ({
        role: m.role,
        content: m.content || "",
      })) as ModelMessage[];
    }
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: coreMessages,
    system: `You are a helpful and precise Student Assistant. You have access to the student's database.
Today is ${new Date().toDateString()}.

When a user asks to import a syllabus, first use 'parse_syllabus' to extract the data, and then ALWAYS use 'showSyllabus' to display it to the user.
When a user asks about their schedule, use 'query_schedule' to get the data, and then ALWAYS use 'showSchedule' to display it.
When updating a task score, use 'update_task_score' to perform the update, and then 'showTaskUpdate' to confirm.

Do not display JSON data in the text response. Use the 'show' tools.`,
    tools: {
      // Server-side tools
      parse_syllabus: tool({
        description:
          "Extracts structured tasks, exams, and weights from raw syllabus text.",
        inputSchema: z.object({
          raw_text: z
            .string()
            .describe("The raw text content of the syllabus to parse"),
          course_code: z
            .string()
            .optional()
            .describe("The course code if available"),
        }),
        execute: async ({ raw_text }: { raw_text: string }) => {
          const { object } = await generateObject({
            model: openai("gpt-4o-mini"),
            schema: z.object({
              course: z.string().describe("Course code e.g. CSC108"),
              tasks: z.array(
                z.object({
                  title: z.string(),
                  weight: z.number(),
                  due_date: z.string(),
                  type: z.string(),
                }),
              ),
            }),
            prompt: `Extract tasks, exams, and weights from this syllabus: \n\n${raw_text}`,
          });
          return object;
        },
      }),

      query_schedule: tool({
        description: "Get tasks due within a date range.",
        inputSchema: z.object({
          start_date: z
            .string()
            .describe("The start date in YYYY-MM-DD format"),
          end_date: z.string().describe("The end date in YYYY-MM-DD format"),
        }),
        execute: async ({
          start_date,
          end_date,
        }: {
          start_date: string;
          end_date: string;
        }) => {
          const results = await db
            .select()
            .from(tasks)
            .where(
              and(
                eq(tasks.userId, user.id),
                gte(tasks.dueDate, new Date(start_date)),
                lte(tasks.dueDate, new Date(end_date)),
              ),
            );
          return results;
        },
      }),

      update_task_score: tool({
        description: "Update the score for a specific task.",
        inputSchema: z.object({
          task_name: z
            .string()
            .describe("The fuzzy name of the task to update"),
          score: z.number().describe("The score received (0-100)"),
        }),
        execute: async ({
          task_name,
          score,
        }: {
          task_name: string;
          score: number;
        }) => {
          const foundTasks = await db
            .select()
            .from(tasks)
            .where(
              and(
                eq(tasks.userId, user.id),
                ilike(tasks.title, `%${task_name}%`),
              ),
            );

          if (foundTasks.length === 0)
            return { success: false, message: "Task not found." };

          await db
            .update(tasks)
            .set({ scoreReceived: String(score) })
            .where(eq(tasks.id, foundTasks[0].id));

          return { success: true, task: foundTasks[0].title, score };
        },
      }),

      // Client-side display tools
      showSyllabus: {
        description: "Display the parsed syllabus data to the user.",
        inputSchema: z.object({
          data: z.object({
            course: z.string(),
            tasks: z.array(
              z.object({
                title: z.string(),
                weight: z.number(),
                due_date: z.string(),
                type: z.string(),
              }),
            ),
          }),
        }),
      },

      showSchedule: {
        description: "Display the schedule/tasks to the user.",
        inputSchema: z.object({
          tasks: z.array(z.any()),
          startDate: z.string(),
          endDate: z.string(),
        }),
      },

      showTaskUpdate: {
        description: "Display a confirmation of the task update.",
        inputSchema: z.object({
          taskName: z.string(),
          score: z.number(),
          status: z.string(),
        }),
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
