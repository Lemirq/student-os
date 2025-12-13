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
import { tasks, courses, gradeWeights } from "@/schema";
import { eq, and, ilike, gte, lte, isNull, inArray } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 30;

// Define message types
type IncomingMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  experimental_attachments?: Array<{
    name?: string;
    contentType?: string;
    url: string;
  }>;
  files?: Array<{
    name?: string;
    contentType?: string;
    url: string;
  }>; // Older/Alternative field name
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
  raw_text?: string;
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
    showGradeRequirements: {
      input: {
        data: {
          current_grade: string;
          goal_grade: number;
          remaining_weight: number;
          required_avg_on_remaining: string;
          status: string;
        };
      };
      output: string;
    };
    showScheduleUpdate: {
      input: {
        message: string;
        updates: Array<{ title: string; new_do_date: string }>;
      };
      output: string;
    };
    showPriorityRebalance: {
      input: {
        message: string;
        count: number;
      };
      output: string;
    };
    showCreatedTasks: {
      input: {
        tasks: Array<TaskData>;
      };
      output: string;
    };
    showMissingData: {
      input: {
        tasks_without_weights: Array<{ title: string; course: string | null }>;
        tasks_without_dates: Array<{ title: string }>;
        suggestion: string;
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

  // Process PDF attachments
  if (Array.isArray(messages)) {
    for (const message of messages as IncomingMessage[]) {
      if (message.role === "user") {
        const attachments =
          message.experimental_attachments || message.files || [];
        for (const attachment of attachments) {
          if (
            attachment.contentType === "application/pdf" &&
            attachment.url.startsWith("data:")
          ) {
            try {
              // Call the internal PDF parsing API
              // Forward cookies to maintain authentication
              const cookieHeader = req.headers.get("cookie");
              const response = await fetch(new URL("/api/parse-pdf", req.url), {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(cookieHeader ? { Cookie: cookieHeader } : {}),
                },
                body: JSON.stringify({ fileUrl: attachment.url }),
              });

              if (response.ok) {
                const { text } = await response.json();
                message.content += `\n\n[Attachment: ${
                  attachment.name || "PDF"
                }]\n${text}`;
                // Remove the attachment from the message so it's not sent to the model as a raw file
                // The model will see the extracted text content instead
              } else {
                console.error(
                  "Failed to parse PDF via API",
                  await response.text(),
                );
                message.content += `\n\n[Attachment: ${
                  attachment.name || "PDF"
                }] (Failed to parse PDF)`;
              }
            } catch (e) {
              console.error("Failed to call PDF parse API", e);
              message.content += `\n\n[Attachment: ${
                attachment.name || "PDF"
              }] (Failed to parse PDF)`;
            }
          }
        }
        // Clean up attachments from the message object so they aren't processed again by convertToModelMessages
        // or sent to the model as raw data which can cause confusion or errors.
        delete message.experimental_attachments;
        delete message.files;
      }
    }
  }

  let coreMessages = [] as ModelMessage[];
  try {
    coreMessages = Array.isArray(messages)
      ? convertToModelMessages(messages)
      : [];

    console.log("coreMessages", coreMessages[0].content);
  } catch (error) {
    console.error("Error converting messages:", error);
    // Fallback: simple mapping for text-only messages to unblock basic chat
    if (Array.isArray(messages)) {
      coreMessages = (messages as IncomingMessage[]).map((m) => ({
        role: m.role,
        content: m.content || "",
      })) as ModelMessage[];
    }
  }

  const result = streamText({
    model: openai("gpt-4o"),
    messages: coreMessages,
    system: `You are a helpful and precise Student Assistant. You have access to the student's database.
Today is ${new Date().toDateString()}.

When a user asks to import a syllabus, first use 'parse_syllabus' to extract the data, and then ALWAYS use 'showSyllabus' to display it to the user. Ensure the raw text from 'parse_syllabus' is passed to 'showSyllabus'.
When a user asks about their schedule, use 'query_schedule' to get the data, and then ALWAYS use 'showSchedule' to display it.
When updating a task score, use 'update_task_score' to perform the update, and then 'showTaskUpdate' to confirm.

When a user asks about grade requirements ("What do I need to get an A?"), use 'calculate_grade_requirements' then 'showGradeRequirements'.
When a user asks to schedule tasks or "Manager" tasks, use 'auto_schedule_tasks' then 'showScheduleUpdate'.
When a user asks to prioritize or rebalance tasks, use 'rebalance_priorities' then 'showPriorityRebalance'.
When a user wants to add tasks via natural language ("I have a quiz on Friday..."), use 'create_tasks_natural_language' then 'showCreatedTasks'.
When a user asks to clean up or find missing data, use 'find_missing_data' then 'showMissingData'.

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
          return { ...object, raw_text };
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
          let foundTasks = await db
            .select()
            .from(tasks)
            .where(
              and(
                eq(tasks.userId, user.id),
                ilike(tasks.title, `%${task_name}%`),
              ),
            );

          if (foundTasks.length === 0) {
            const allTasks = await db
              .select({ id: tasks.id, title: tasks.title })
              .from(tasks)
              .where(eq(tasks.userId, user.id));

            if (allTasks.length > 0) {
              const { object: matchResult } = await generateObject({
                model: openai("gpt-4o-mini"),
                schema: z.object({
                  taskId: z
                    .string()
                    .nullable()
                    .describe(
                      "The ID of the matching task, or null if no good match",
                    ),
                }),
                prompt: `The user wants to update a task named "${task_name}".
Here is the list of available tasks:
${JSON.stringify(allTasks)}

Find the task that best matches "${task_name}". Return its ID. If no task matches well, return null.`,
              });

              if (matchResult.taskId) {
                const matched = await db
                  .select()
                  .from(tasks)
                  .where(eq(tasks.id, matchResult.taskId));
                if (matched.length > 0) {
                  foundTasks = matched;
                }
              }
            }
          }

          if (foundTasks.length === 0)
            return { success: false, message: "Task not found." };

          await db
            .update(tasks)
            .set({ scoreReceived: String(score), status: "Done" })
            .where(eq(tasks.id, foundTasks[0].id));

          return {
            success: true,
            task: foundTasks[0].title,
            score,
            status: "Done",
          };
        },
      }),

      calculate_grade_requirements: tool({
        description:
          "Calculate what score is needed on remaining tasks to hit the goal grade.",
        inputSchema: z.object({
          course_code: z.string().describe("The course code (e.g., 'CSC108')"),
        }),
        execute: async ({ course_code }) => {
          const course = await db.query.courses.findFirst({
            where: eq(courses.code, course_code),
            with: { gradeWeights: true, tasks: true },
          });

          if (!course) return "Course not found.";
          if (!course.goalGrade) return "No goal grade set for this course.";

          let totalWeightAttempted = 0;
          let totalScoreWeighted = 0;
          let remainingWeight = 0;

          course.tasks.forEach((task) => {
            const weightObj = course.gradeWeights.find(
              (w) => w.id === task.gradeWeightId,
            );
            if (!weightObj) return;

            const weight = Number(weightObj.weightPercent);

            if (task.scoreReceived) {
              const score = Number(task.scoreReceived);
              const max = Number(task.scoreMax);
              totalWeightAttempted += weight;
              totalScoreWeighted += (score / max) * weight;
            } else {
              remainingWeight += weight;
            }
          });

          const currentGrade =
            totalWeightAttempted > 0
              ? (totalScoreWeighted / totalWeightAttempted) * 100
              : 0;
          const goal = Number(course.goalGrade);
          const requiredScore =
            remainingWeight > 0
              ? ((goal - totalScoreWeighted) / remainingWeight) * 100
              : 0;

          return {
            current_grade: currentGrade.toFixed(2),
            goal_grade: goal,
            remaining_weight: remainingWeight,
            required_avg_on_remaining: requiredScore.toFixed(2),
            status:
              requiredScore > 100
                ? "Impossible"
                : requiredScore < 0
                  ? "Secured"
                  : "Possible",
          };
        },
      }),

      auto_schedule_tasks: tool({
        description:
          "updates 'do_date' for tasks that don't have one, prioritizing urgent high-weight items.",
        inputSchema: z.object({
          date_range_start: z
            .string()
            .describe("Start of planning period (YYYY-MM-DD)"),
          days_to_plan: z.number().default(7),
        }),
        execute: async ({
          date_range_start: _date_range_start,
          days_to_plan: _days_to_plan,
        }) => {
          const unscheduled = await db
            .select()
            .from(tasks)
            .where(
              and(
                isNull(tasks.doDate),
                eq(tasks.status, "Todo"),
                eq(tasks.userId, user.id),
              ),
            );

          const updates = [];

          for (const task of unscheduled) {
            if (!task.dueDate) continue;

            const doDate = new Date(task.dueDate);
            doDate.setDate(doDate.getDate() - 2); // Buffer rule

            await db
              .update(tasks)
              .set({ doDate: doDate })
              .where(eq(tasks.id, task.id));

            updates.push({
              title: task.title,
              new_do_date: doDate.toISOString(),
            });
          }

          return {
            message: `Scheduled ${updates.length} tasks.`,
            updates,
          };
        },
      }),

      rebalance_priorities: tool({
        description:
          "Scans all Todo tasks and updates priority to 'High' if they are worth > 15% of the grade.",
        inputSchema: z.object({}),
        execute: async () => {
          const highStakesTasks = await db
            .select({
              id: tasks.id,
              title: tasks.title,
              weight: gradeWeights.weightPercent,
            })
            .from(tasks)
            .innerJoin(gradeWeights, eq(tasks.gradeWeightId, gradeWeights.id))
            .where(
              and(
                eq(tasks.status, "Todo"),
                eq(tasks.userId, user.id),
                gte(gradeWeights.weightPercent, "15.00"),
              ),
            );

          if (highStakesTasks.length === 0)
            return "No high stakes tasks found.";

          await db
            .update(tasks)
            .set({ priority: "High" })
            .where(
              inArray(
                tasks.id,
                highStakesTasks.map((t) => t.id),
              ),
            );

          return `Updated ${highStakesTasks.length} tasks to High Priority based on grade weight.`;
        },
      }),

      create_tasks_natural_language: tool({
        description:
          "Parses a natural language string into multiple task entries.",
        inputSchema: z.object({
          request: z
            .string()
            .describe("e.g. 'Math quiz Friday, Physics paper due Monday'"),
          current_date: z
            .string()
            .describe("ISO string of today's date for relative time calc"),
        }),
        execute: async ({ request, current_date }) => {
          const { object } = await generateObject({
            model: openai("gpt-4o-mini"),
            schema: z.object({
              tasks: z.array(
                z.object({
                  title: z.string(),
                  due_date: z.string(), // ISO
                  course_code_guess: z.string().optional(),
                }),
              ),
            }),
            prompt: `Current date: ${current_date}. Extract tasks from: "${request}"`,
          });

          const created = [];
          for (const t of object.tasks) {
            // Try to find course if guess provided
            let courseId = null;
            if (t.course_code_guess) {
              const course = await db.query.courses.findFirst({
                where: eq(courses.code, t.course_code_guess),
              });
              if (course) courseId = course.id;
            }

            const result = await db
              .insert(tasks)
              .values({
                title: t.title,
                dueDate: new Date(t.due_date),
                userId: user.id,
                status: "Todo",
                courseId: courseId,
              })
              .returning();
            created.push(result[0]);
          }
          return created;
        },
      }),

      find_missing_data: tool({
        description:
          "Finds tasks that are missing critical info like due dates or weights.",
        inputSchema: z.object({}),
        execute: async () => {
          const missingWeights = await db
            .select({ title: tasks.title, course: courses.code })
            .from(tasks)
            .leftJoin(courses, eq(tasks.courseId, courses.id))
            .where(and(isNull(tasks.gradeWeightId), eq(tasks.userId, user.id)));

          const missingDates = await db
            .select({ title: tasks.title })
            .from(tasks)
            .where(and(isNull(tasks.dueDate), eq(tasks.userId, user.id)));

          return {
            tasks_without_weights: missingWeights,
            tasks_without_dates: missingDates,
            suggestion: "Should I assign these to a category?",
          };
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
            raw_text: z.string().optional(),
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

      showGradeRequirements: {
        description: "Display grade requirement calculations.",
        inputSchema: z.object({
          data: z.object({
            current_grade: z.string(),
            goal_grade: z.number(),
            remaining_weight: z.number(),
            required_avg_on_remaining: z.string(),
            status: z.string(),
          }),
        }),
      },

      showScheduleUpdate: {
        description: "Display tasks that were auto-scheduled.",
        inputSchema: z.object({
          message: z.string(),
          updates: z.array(
            z.object({
              title: z.string(),
              new_do_date: z.string(),
            }),
          ),
        }),
      },

      showPriorityRebalance: {
        description: "Display result of priority rebalancing.",
        inputSchema: z.object({
          message: z.string(),
          count: z.number(),
        }),
      },

      showCreatedTasks: {
        description: "Display newly created tasks from natural language.",
        inputSchema: z.object({
          tasks: z.array(z.any()),
        }),
      },

      showMissingData: {
        description: "Display tasks with missing data.",
        inputSchema: z.object({
          tasks_without_weights: z.array(
            z.object({ title: z.string(), course: z.string().nullable() }),
          ),
          tasks_without_dates: z.array(z.object({ title: z.string() })),
          suggestion: z.string(),
        }),
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
