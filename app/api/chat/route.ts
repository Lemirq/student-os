import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

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

  // Fetch user's courses and grade weights for context
  const userCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.userId, user.id));

  const courseIds = userCourses.map((c) => c.id);
  const userGradeWeights =
    courseIds.length > 0
      ? await db
          .select()
          .from(gradeWeights)
          .where(inArray(gradeWeights.courseId, courseIds))
      : [];

  const coreMessages = convertToModelMessages(messages);
  console.log(JSON.stringify(coreMessages, null, 2));
  const system = `You are a helpful and precise Student Assistant. You have access to the student's database.
    Today is ${new Date().toDateString()}.
    
    STUDENT'S COURSES:
${
  userCourses.length > 0
    ? userCourses
        .map(
          (c) =>
            `- ${c.code}: ${c.name} (ID: ${c.id}${c.goalGrade ? `, Goal: ${c.goalGrade}` : ""})`,
        )
        .join("\n")
    : "(No courses added yet)"
}

    GRADE WEIGHTS:
${
  userGradeWeights.length > 0
    ? userGradeWeights
        .map((gw) => {
          const course = userCourses.find((c) => c.id === gw.courseId);
          return `- [${course?.code}] ${gw.name}: ${gw.weightPercent}% (ID: ${gw.id})`;
        })
        .join("\n")
    : "(No grade weights added yet)"
}
    
    RULES:
    1. **Syllabus Import:** When a user provides a syllabus (text/file), FIRST call 'parse_syllabus'. THEN, immediately call 'showSyllabus' with the parsed data. Do not speak, just show the UI.
    2. **Schedule Check:** When asked about schedule/tasks, call 'query_schedule' -> 'showSchedule'.
    3. **Grades:** When asked "What do I need for an A?", call 'calculate_grade_requirements' -> 'showGradeRequirements'.
    4. **Scheduling:** When asked to "plan my week" or "schedule tasks", call 'auto_schedule_tasks' -> 'showScheduleUpdate'.
    5. **Priorities:** When asked to "rebalance" or "what's important?", call 'rebalance_priorities' -> 'showPriorityRebalance'.
    6. **Quick Add:** When the user says "I have a quiz Friday...", call 'create_tasks_natural_language' -> 'showCreatedTasks'. Use the course codes and grade weight IDs provided above.
    7. **Clean Up:** When asked to find missing info, call 'find_missing_data' -> 'showMissingData'.
    8. **Grade Weights:** When asked to view, add, update, or delete grade weights, call 'manage_grade_weights' -> 'showGradeWeights'. Always show the full updated list after any changes.
    
    Do not display raw JSON in text. Use the 'show*' tools to render the UI components.`;
  console.log(system);
  const result = streamText({
    // model: google("gemini-2.5-flash"), will cause ts error, add // @ts-expect-error Beta library hasn't updated to support google yet
    model: openai("gpt-4o"),
    messages: coreMessages,
    // -----------------------------------------------------------------------
    // THE BRAIN: System Prompt controls the "Workflow"
    // -----------------------------------------------------------------------
    system,

    tools: {
      // -----------------------------------------------------------------------
      // 1. SYLLABUS TOOLS
      // -----------------------------------------------------------------------
      parse_syllabus: tool({
        description:
          "ONLY parses syllabus text into structured data. Does NOT create any database records. Returns data for preview only.",
        inputSchema: z.object({
          raw_text: z.string().describe("The raw text content"),
          course_code: z.string().optional(),
        }),
        execute: async ({ raw_text }) => {
          // This tool ONLY parses - no database operations
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
          // Return parsed data only - user must click "Import to Database" in UI
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
                  course_code: z
                    .string()
                    .describe("Use exact course code from available courses"),
                  grade_weight_id: z
                    .string()
                    .describe(
                      "Use exact grade weight ID from available weights",
                    ),
                  description: z
                    .string()
                    .describe("Task description with location/time details"),
                  due_date: z.string().describe("ISO Date string"),
                  priority: z.enum(["Low", "Medium", "High"]),
                }),
              ),
            }),
            prompt: `Current date: ${new Date().toISOString()}.
            
Available courses: ${userCourses.map((c) => c.code).join(", ")}
Available grade weights: ${userGradeWeights
              .map((gw) => {
                const course = userCourses.find((c) => c.id === gw.courseId);
                return `${gw.id} (${course?.code} - ${gw.name})`;
              })
              .join(", ")}

Extract tasks from: "${request}"
- Use the exact course codes from the available courses list
- Use the exact grade weight IDs from the available weights list
- For exams, try to use the "Exam" or "Midterm" grade weight ID for that course
- If you cannot determine a field, use an empty string ""
- Include location and time information in the description field`,
          });

          const newTasks = [];
          for (const t of object.tasks) {
            // Look up the course by course code
            let courseId = null;
            if (t.course_code) {
              const course = await db
                .select()
                .from(courses)
                .where(
                  and(
                    eq(courses.userId, user.id),
                    ilike(courses.code, t.course_code),
                  ),
                )
                .limit(1);
              if (course.length > 0) {
                courseId = course[0].id;
              }
            }

            const res = await db
              .insert(tasks)
              .values({
                userId: user.id,
                courseId: courseId,
                gradeWeightId: t.grade_weight_id || null,
                title: t.title,
                description: t.description || null,
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
      // 4. GRADE WEIGHT MANAGEMENT TOOLS
      // -----------------------------------------------------------------------
      manage_grade_weights: tool({
        description:
          "Search for courses and manage grade weights (list, add, update, delete). Use fuzzy search with course name/code.",
        inputSchema: z.object({
          action: z
            .enum(["list", "add", "update", "delete"])
            .describe("The action to perform on grade weights"),
          course_code: z
            .string()
            .describe(
              "The course code or name to search for (e.g., 'CSC108' or 'Intro to')",
            ),
          grade_weight_name: z
            .string()
            .optional()
            .describe(
              "Name of the grade weight category (for add/update operations)",
            ),
          weight_percent: z
            .number()
            .optional()
            .describe("The weight percentage (for add/update operations)"),
          grade_weight_id: z
            .string()
            .optional()
            .describe("The ID of the grade weight to update or delete"),
        }),
        execute: async ({
          action,
          course_code,
          grade_weight_name,
          weight_percent,
          grade_weight_id,
        }) => {
          // 1. Find the course using fuzzy search
          const foundCourses = await db
            .select()
            .from(courses)
            .where(
              and(
                eq(courses.userId, user.id),
                ilike(courses.code, `%${course_code}%`),
              ),
            );

          if (foundCourses.length === 0) {
            // Try searching by course name too
            const coursesByName = await db
              .select()
              .from(courses)
              .where(
                and(
                  eq(courses.userId, user.id),
                  ilike(courses.name, `%${course_code}%`),
                ),
              );

            if (coursesByName.length === 0) {
              return {
                success: false,
                error: `No course found matching "${course_code}". Please check the course code or name.`,
              };
            }
            foundCourses.push(...coursesByName);
          }

          const course = foundCourses[0];

          // 2. Perform the requested action
          switch (action) {
            case "list": {
              const weights = await db
                .select()
                .from(gradeWeights)
                .where(eq(gradeWeights.courseId, course.id));

              const totalWeight = weights.reduce(
                (sum, w) =>
                  sum + parseFloat(w.weightPercent?.toString() || "0"),
                0,
              );

              return {
                success: true,
                course: {
                  code: course.code,
                  name: course.name,
                  id: course.id,
                },
                grade_weights: weights.map((w) => ({
                  id: w.id,
                  name: w.name,
                  weight_percent: parseFloat(
                    w.weightPercent?.toString() || "0",
                  ),
                })),
                total_weight: totalWeight,
                is_valid: Math.abs(totalWeight - 100) < 0.01,
              };
            }

            case "add": {
              if (!grade_weight_name || weight_percent === undefined) {
                return {
                  success: false,
                  error:
                    "Both grade_weight_name and weight_percent are required for adding.",
                };
              }

              const newWeight = await db
                .insert(gradeWeights)
                .values({
                  courseId: course.id,
                  name: grade_weight_name,
                  weightPercent: String(weight_percent),
                })
                .returning();

              // Get updated list
              const allWeights = await db
                .select()
                .from(gradeWeights)
                .where(eq(gradeWeights.courseId, course.id));

              const totalWeight = allWeights.reduce(
                (sum, w) =>
                  sum + parseFloat(w.weightPercent?.toString() || "0"),
                0,
              );

              return {
                success: true,
                action: "added",
                course: {
                  code: course.code,
                  name: course.name,
                },
                new_weight: {
                  id: newWeight[0].id,
                  name: newWeight[0].name,
                  weight_percent: parseFloat(
                    newWeight[0].weightPercent?.toString() || "0",
                  ),
                },
                grade_weights: allWeights.map((w) => ({
                  id: w.id,
                  name: w.name,
                  weight_percent: parseFloat(
                    w.weightPercent?.toString() || "0",
                  ),
                })),
                total_weight: totalWeight,
                is_valid: Math.abs(totalWeight - 100) < 0.01,
              };
            }

            case "update": {
              if (!grade_weight_id) {
                // Try to find by name if ID not provided
                if (!grade_weight_name) {
                  return {
                    success: false,
                    error:
                      "Either grade_weight_id or grade_weight_name is required for updating.",
                  };
                }

                const existingWeights = await db
                  .select()
                  .from(gradeWeights)
                  .where(
                    and(
                      eq(gradeWeights.courseId, course.id),
                      ilike(gradeWeights.name, `%${grade_weight_name}%`),
                    ),
                  );

                if (existingWeights.length === 0) {
                  return {
                    success: false,
                    error: `No grade weight found matching "${grade_weight_name}" in ${course.code}`,
                  };
                }

                grade_weight_id = existingWeights[0].id;
              }

              const updates: { name?: string; weightPercent?: string } = {};
              if (grade_weight_name) updates.name = grade_weight_name;
              if (weight_percent !== undefined)
                updates.weightPercent = String(weight_percent);

              const updatedWeight = await db
                .update(gradeWeights)
                .set(updates)
                .where(eq(gradeWeights.id, grade_weight_id))
                .returning();

              if (updatedWeight.length === 0) {
                return {
                  success: false,
                  error: "Grade weight not found or unauthorized.",
                };
              }

              // Get updated list
              const allWeights = await db
                .select()
                .from(gradeWeights)
                .where(eq(gradeWeights.courseId, course.id));

              const totalWeight = allWeights.reduce(
                (sum, w) =>
                  sum + parseFloat(w.weightPercent?.toString() || "0"),
                0,
              );

              return {
                success: true,
                action: "updated",
                course: {
                  code: course.code,
                  name: course.name,
                },
                updated_weight: {
                  id: updatedWeight[0].id,
                  name: updatedWeight[0].name,
                  weight_percent: parseFloat(
                    updatedWeight[0].weightPercent?.toString() || "0",
                  ),
                },
                grade_weights: allWeights.map((w) => ({
                  id: w.id,
                  name: w.name,
                  weight_percent: parseFloat(
                    w.weightPercent?.toString() || "0",
                  ),
                })),
                total_weight: totalWeight,
                is_valid: Math.abs(totalWeight - 100) < 0.01,
              };
            }

            case "delete": {
              if (!grade_weight_id) {
                // Try to find by name if ID not provided
                if (!grade_weight_name) {
                  return {
                    success: false,
                    error:
                      "Either grade_weight_id or grade_weight_name is required for deleting.",
                  };
                }

                const existingWeights = await db
                  .select()
                  .from(gradeWeights)
                  .where(
                    and(
                      eq(gradeWeights.courseId, course.id),
                      ilike(gradeWeights.name, `%${grade_weight_name}%`),
                    ),
                  );

                if (existingWeights.length === 0) {
                  return {
                    success: false,
                    error: `No grade weight found matching "${grade_weight_name}" in ${course.code}`,
                  };
                }

                grade_weight_id = existingWeights[0].id;
              }

              const deletedWeight = await db
                .delete(gradeWeights)
                .where(eq(gradeWeights.id, grade_weight_id))
                .returning();

              if (deletedWeight.length === 0) {
                return {
                  success: false,
                  error: "Grade weight not found or unauthorized.",
                };
              }

              // Get updated list
              const allWeights = await db
                .select()
                .from(gradeWeights)
                .where(eq(gradeWeights.courseId, course.id));

              const totalWeight = allWeights.reduce(
                (sum, w) =>
                  sum + parseFloat(w.weightPercent?.toString() || "0"),
                0,
              );

              return {
                success: true,
                action: "deleted",
                course: {
                  code: course.code,
                  name: course.name,
                },
                deleted_weight: {
                  name: deletedWeight[0].name,
                  weight_percent: parseFloat(
                    deletedWeight[0].weightPercent?.toString() || "0",
                  ),
                },
                grade_weights: allWeights.map((w) => ({
                  id: w.id,
                  name: w.name,
                  weight_percent: parseFloat(
                    w.weightPercent?.toString() || "0",
                  ),
                })),
                total_weight: totalWeight,
                is_valid: Math.abs(totalWeight - 100) < 0.01,
              };
            }

            default:
              return { success: false, error: "Invalid action" };
          }
        },
      }),

      // -----------------------------------------------------------------------
      // 5. UI DISPLAY TOOLS (The "Show" Layer)
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
      showGradeWeights: tool({
        description: "Show grade weights management results.",
        inputSchema: z.object({
          result: z.any().describe("The result from manage_grade_weights"),
        }),
        execute: async ({ result }) => ({ result }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
