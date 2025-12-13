import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  tool,
  generateObject,
  UIMessage,
} from "ai";
import { z } from "zod";
import { db } from "@/drizzle";

export type StudentOSToolCallsMessage = UIMessage;
import { tasks, courses, gradeWeights } from "@/schema";
import { eq, and, ilike, isNull, gte, lte, inArray } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 60; // Allow longer timeouts for complex DB ops

export async function POST(req: Request) {
  const { messages } = await req.json();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-4o"),
    messages: coreMessages,
    // -----------------------------------------------------------------------
    // THE BRAIN: System Prompt controls the "Workflow"
    // -----------------------------------------------------------------------
    system: `You are a helpful and precise Student Assistant. You have access to the student's database.
    Today is ${new Date().toDateString()}.
    
    RULES:
    1. **Syllabus Import:** When a user provides a syllabus (text/file), FIRST call 'parse_syllabus'. THEN, immediately call 'showSyllabus' with the parsed data. Do not speak, just show the UI.
    2. **Schedule Check:** When asked about schedule/tasks, call 'query_schedule' -> 'showSchedule'.
    3. **Grades:** When asked "What do I need for an A?", call 'calculate_grade_requirements' -> 'showGradeRequirements'.
    4. **Scheduling:** When asked to "plan my week" or "schedule tasks", call 'auto_schedule_tasks' -> 'showScheduleUpdate'.
    5. **Priorities:** When asked to "rebalance" or "what's important?", call 'rebalance_priorities' -> 'showPriorityRebalance'.
    6. **Quick Add:** When the user says "I have a quiz Friday...", call 'create_tasks_natural_language' -> 'showCreatedTasks'.
    7. **Clean Up:** When asked to find missing info, call 'find_missing_data' -> 'showMissingData'.
    
    Do not display raw JSON in text. Use the 'show*' tools to render the UI components.`,

    tools: {
      // -----------------------------------------------------------------------
      // 1. SYLLABUS TOOLS
      // -----------------------------------------------------------------------
      parse_syllabus: tool({
        description:
          "Extracts structured tasks, exams, and weights from raw syllabus text.",
        inputSchema: z.object({
          raw_text: z.string().describe("The raw text content"),
          course_code: z.string().optional(),
        }),
        execute: async ({ raw_text }) => {
          const { object } = await generateObject({
            model: openai("gpt-4o-mini"), // Fast & Cheap for parsing
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

      // -----------------------------------------------------------------------
      // 2. GRADE STRATEGIST TOOLS
      // -----------------------------------------------------------------------
      calculate_grade_requirements: tool({
        description:
          "Calculates required score on remaining tasks to hit a goal.",
        inputSchema: z.object({
          course_code: z.string().describe("The course code (e.g., 'CSC108')"),
        }),
        execute: async ({ course_code }) => {
          const course = await db.query.courses.findFirst({
            where: and(
              eq(courses.userId, user.id),
              ilike(courses.code, course_code),
            ),
            with: { gradeWeights: true, tasks: true },
          });

          if (!course) return { error: "Course not found" };

          let totalWeightAttempted = 0;
          let totalScoreWeighted = 0;
          let remainingWeight = 0;

          course.tasks.forEach((task) => {
            // Find weight for this task
            const weightObj = course.gradeWeights.find(
              (w) => w.id === task.gradeWeightId,
            );
            if (!weightObj) return;

            const weight = Number(weightObj.weightPercent);

            if (task.scoreReceived) {
              const score = Number(task.scoreReceived);
              const max = Number(task.scoreMax) || 100;
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
          const goal = Number(course.goalGrade) || 85;
          // Math: (Goal - WeightedScoreSoFar) / RemainingWeight
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

      // -----------------------------------------------------------------------
      // 3. TASK MANAGER TOOLS
      // -----------------------------------------------------------------------
      update_task_score: tool({
        description: "Updates score for a specific task using fuzzy search.",
        inputSchema: z.object({
          task_name: z.string(),
          score: z.number(),
        }),
        execute: async ({ task_name, score }) => {
          // 1. Try Simple Match
          let foundTasks = await db
            .select()
            .from(tasks)
            .where(
              and(
                eq(tasks.userId, user.id),
                ilike(tasks.title, `%${task_name}%`),
              ),
            );

          // 2. Fallback: LLM Fuzzy Match
          if (foundTasks.length === 0) {
            const allTasks = await db
              .select({ id: tasks.id, title: tasks.title })
              .from(tasks)
              .where(eq(tasks.userId, user.id));
            if (allTasks.length > 0) {
              const { object: match } = await generateObject({
                model: openai("gpt-4o-mini"),
                schema: z.object({ taskId: z.string().nullable() }),
                prompt: `User wants "${task_name}". Match to one of: ${JSON.stringify(allTasks)}`,
              });
              if (match.taskId) {
                foundTasks = await db
                  .select()
                  .from(tasks)
                  .where(eq(tasks.id, match.taskId));
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

      create_tasks_natural_language: tool({
        description: "Parses natural language requests into task rows.",
        inputSchema: z.object({
          request: z.string(),
        }),
        execute: async ({ request }) => {
          const { object } = await generateObject({
            model: openai("gpt-4o-mini"),
            schema: z.object({
              tasks: z.array(
                z.object({
                  title: z.string(),
                  course_code: z.string(),
                  grade_weight_id: z.string(),
                  description: z.string().optional(),
                  due_date: z.string().describe("ISO Date string"),
                  priority: z.enum(["Low", "Medium", "High"]),
                }),
              ),
            }),
            prompt: `Current date: ${new Date().toISOString()}. Extract tasks from: "${request}"`,
          });

          const newTasks = [];
          for (const t of object.tasks) {
            const res = await db
              .insert(tasks)
              .values({
                userId: user.id,
                title: t.title,
                dueDate: new Date(t.due_date),
                priority: t.priority,
                status: "Todo",
              })
              .returning();
            newTasks.push(res[0]);
          }
          return { tasks: newTasks };
        },
      }),

      auto_schedule_tasks: tool({
        description: "Assigns 'do_date' to unscheduled tasks.",
        inputSchema: z.object({}),
        execute: async () => {
          const unscheduled = await db
            .select()
            .from(tasks)
            .where(
              and(
                eq(tasks.userId, user.id),
                isNull(tasks.doDate),
                eq(tasks.status, "Todo"),
              ),
            );

          const updates = [];
          for (const t of unscheduled) {
            if (!t.dueDate) continue;
            const doDate = new Date(t.dueDate);
            doDate.setDate(doDate.getDate() - 2); // Buffer: 2 days before

            await db.update(tasks).set({ doDate }).where(eq(tasks.id, t.id));
            updates.push({ title: t.title, new_do_date: doDate.toISOString() });
          }
          return { message: "Auto-scheduled tasks.", updates };
        },
      }),

      rebalance_priorities: tool({
        description: "Sets priority to High for heavy assignments (>15%).",
        inputSchema: z.object({}),
        execute: async () => {
          // Complex Join: Tasks -> GradeWeights -> Check Weight > 15
          const highStakes = await db
            .select({ id: tasks.id })
            .from(tasks)
            .innerJoin(gradeWeights, eq(tasks.gradeWeightId, gradeWeights.id))
            .where(
              and(
                eq(tasks.userId, user.id),
                eq(tasks.status, "Todo"),
                gte(gradeWeights.weightPercent, "15.00"),
              ),
            );

          if (highStakes.length > 0) {
            await db
              .update(tasks)
              .set({ priority: "High" })
              .where(
                inArray(
                  tasks.id,
                  highStakes.map((t) => t.id),
                ),
              );
          }
          return {
            message: "Priorities rebalanced.",
            count: highStakes.length,
          };
        },
      }),

      query_schedule: tool({
        description: "Get tasks due in range.",
        inputSchema: z.object({ start_date: z.string(), end_date: z.string() }),
        execute: async ({ start_date, end_date }) => {
          return await db
            .select()
            .from(tasks)
            .where(
              and(
                eq(tasks.userId, user.id),
                gte(tasks.dueDate, new Date(start_date)),
                lte(tasks.dueDate, new Date(end_date)),
              ),
            );
        },
      }),

      find_missing_data: tool({
        description: "Finds tasks missing weights or dates.",
        inputSchema: z.object({}),
        execute: async () => {
          const missing = await db
            .select({ title: tasks.title })
            .from(tasks)
            .where(and(eq(tasks.userId, user.id), isNull(tasks.dueDate)));
          return { tasks_without_dates: missing, suggestion: "Add due dates?" };
        },
      }),

      // -----------------------------------------------------------------------
      // 4. UI DISPLAY TOOLS (The "Show" Layer)
      // -----------------------------------------------------------------------
      showSyllabus: tool({
        description: "Show parsed syllabus.",
        inputSchema: z.object({ data: z.any() }),
        execute: async ({ data }) => ({ data }),
      }),
      showSchedule: tool({
        description: "Show schedule list.",
        inputSchema: z.object({ tasks: z.any() }),
        execute: async ({ tasks }) => ({ tasks }),
      }),
      showGradeRequirements: tool({
        description: "Show grade prediction card.",
        inputSchema: z.object({ data: z.any() }),
        execute: async ({ data }) => ({ data }),
      }),
      showTaskUpdate: tool({
        description: "Show update confirmation.",
        inputSchema: z.object({ taskUpdate: z.any() }),
        execute: async ({ taskUpdate }) => ({ taskUpdate }),
      }),
      showCreatedTasks: tool({
        description: "Show created tasks list.",
        inputSchema: z.object({ tasks: z.any() }),
        execute: async ({ tasks }) => ({ tasks }),
      }),
      showScheduleUpdate: tool({
        description: "Show auto-schedule results.",
        inputSchema: z.object({ updates: z.any() }),
        execute: async ({ updates }) => ({ updates }),
      }),
      showPriorityRebalance: tool({
        description: "Show priority changes.",
        inputSchema: z.object({ count: z.number() }),
        execute: async ({ count }) => ({ count }),
      }),
      showMissingData: tool({
        description: "Show cleanup list.",
        inputSchema: z.object({
          tasks_without_dates: z.any(),
          suggestion: z.string(),
        }),
        execute: async ({ tasks_without_dates, suggestion }) => ({
          tasks_without_dates,
          suggestion,
        }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
