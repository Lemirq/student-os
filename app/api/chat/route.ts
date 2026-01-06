import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import {
  convertToModelMessages,
  streamText,
  tool,
  generateText,
  Output,
  UIMessage,
} from "ai";
import { z } from "zod";
import { db } from "@/drizzle";
import {
  tavilySearch,
  tavilyExtract,
  tavilyCrawl,
  tavilyMap,
} from "@tavily/ai-sdk";
// import { searchDocuments } from "@/actions/documents/search-documents";
import { saveTextDocument } from "@/actions/documents/save-text-document";
import { searchDocumentsWithRRF } from "@/actions/documents/search-documents-rrf";
import * as chrono from "chrono-node";
import { documents } from "@/schema";

export type StudentOSToolCallsMessage = UIMessage;
import { tasks, courses, gradeWeights, semesters } from "@/schema";
import {
  eq,
  and,
  ilike,
  isNull,
  gte,
  lte,
  inArray,
  sql,
  SQL,
} from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { openRouterApiKey, tavilyApiKey } from "@/lib/env";
import { PageContext } from "@/actions/page-context";
import { formatContextForAI, setTimeInTimezone } from "@/lib/utils";

export const maxDuration = 90; // Allow longer timeouts for complex DB ops and parsing

const openRouterClient = createOpenRouter({
  apiKey: openRouterApiKey,
});
// Main chat model - GPT-4o is fast and capable
const glm = openRouterClient.chat("openai/gpt-4o");
// Even faster model for structured data extraction (syllabus parsing, etc.)
const glmFast = openRouterClient.chat("openai/gpt-4o-mini");

export async function POST(req: Request) {
  const { messages, pageContext, aiContext, timezone } = (await req.json()) as {
    messages: UIMessage[];
    pageContext?: PageContext;
    aiContext?: {
      courses: (typeof courses.$inferSelect)[];
      gradeWeights: (typeof gradeWeights.$inferSelect)[];
    };
    timezone?: string; // User's IANA timezone (e.g., "America/New_York")
  };
  // Default to UTC if no timezone provided
  const userTimezone = timezone || "UTC";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get current semester ID for filtering
  const [currentSemester] = await db
    .select({ id: semesters.id })
    .from(semesters)
    .where(and(eq(semesters.userId, user.id), eq(semesters.isCurrent, true)))
    .limit(1);

  const currentSemesterId = currentSemester?.id;

  // Use cached AI context if available, otherwise fetch from DB
  let userCourses, userGradeWeights;

  if (aiContext?.courses && aiContext?.gradeWeights) {
    // Use cached context from client
    userCourses = aiContext.courses;
    userGradeWeights = aiContext.gradeWeights;
  } else {
    // Fallback: fetch from DB (filtered by current semester)
    userCourses = await db
      .select({
        id: courses.id,
        userId: courses.userId,
        semesterId: courses.semesterId,
        code: courses.code,
        name: courses.name,
        color: courses.color,
        goalGrade: courses.goalGrade,
        createdAt: courses.createdAt,
        syllabus: sql<string | null>`NULL`.as("syllabus"), // Exclude syllabus data
      })
      .from(courses)
      .where(
        and(
          eq(courses.userId, user.id),
          currentSemesterId
            ? eq(courses.semesterId, currentSemesterId)
            : sql`1=0`,
        ),
      );

    const courseIds = userCourses.map((c) => c.id);
    userGradeWeights =
      courseIds.length > 0
        ? await db
            .select()
            .from(gradeWeights)
            .where(inArray(gradeWeights.courseId, courseIds))
        : [];
  }

  const coreMessages = await convertToModelMessages(messages);
  // for debugging: console.log(JSON.stringify(coreMessages, null, 2));

  const requestStartTime = Date.now();
  console.log("[chat] Starting chat processing");

  // Format page context for the system prompt
  const pageContextString = pageContext
    ? formatContextForAI(pageContext)
    : "User's current page is unknown.";

  // Fetch document information for current course if on course page
  let availableDocumentsInfo = "";
  if (pageContext?.type === "course") {
    const docCounts = await db
      .select({
        documentType: documents.documentType,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(documents)
      .where(
        and(
          eq(documents.userId, user.id),
          eq(documents.courseId, pageContext.id),
        ),
      )
      .groupBy(documents.documentType);

    const totalCount = docCounts.reduce((sum, d) => sum + Number(d.count), 0);
    if (totalCount > 0) {
      const docInfo = docCounts
        .map((d) => `${d.count} ${d.documentType}(s)`)
        .join(", ");
      availableDocumentsInfo = `
    AVAILABLE DOCUMENTS FOR THIS COURSE:
    This course has ${totalCount} uploaded documents (${docInfo}). Use 'retrieve_course_context' to search them.`;
    }
  }

  const system = `You are a helpful and precise Student Assistant. You have access to the student's database.
    Today is ${new Date().toDateString()}.

    PAGE: ${pageContextString}
    ${availableDocumentsInfo}

    COURSES (${userCourses.length}): ${userCourses.map((c) => c.code).join(", ")}

    TOOL USAGE:
    - Each tool handles its own UI - call ONCE
    - For course questions: Proactively use 'retrieve_course_context' when on course page
    - For syllabi: 'parse_syllabus' (fast extraction)
    - For tasks: 'create_tasks_natural_language', 'search_tasks', 'update_task_score', 'bulk_update_tasks'
    - For grades: 'calculate_grade_requirements', 'manage_grade_weights'
    - For schedule: 'query_schedule', 'auto_schedule_tasks'
    - For research: 'web_search', 'extract_content', 'crawl_website'
    - For memory: 'save_to_memory' to store info
    - DO NOT chain tools. Do NOT display raw JSON.

    IMPORTANT: Be proactive about retrieving context from documents when viewing a course page.`;
  console.log(
    `[chat] System prompt length: ${system.length} characters, courses: ${userCourses.length}, grade weights: ${userGradeWeights.length}`,
  );
  console.log("[chat] Calling streamText...");

  const result = streamText({
    // @ts-expect-error OpenRouter provider types are incompatible with AI SDK beta
    model: glm,
    maxCompletionTokens: 2000, // Limit response length for faster generation
    messages: coreMessages,
    // -----------------------------------------------------------------------
    // THE BRAIN: System Prompt controls the "Workflow"
    // -----------------------------------------------------------------------
    system,

    // Track completion time
    onFinish: () => {
      const totalTime = Date.now() - requestStartTime;
      console.log(`[chat] Total processing time: ${totalTime}ms`);
    },

    tools: {
      // -----------------------------------------------------------------------
      // 1. SYLLABUS TOOL (Composite: parse + UI generation in one step)
      // -----------------------------------------------------------------------
      parse_syllabus: tool({
        description:
          "Parses syllabus text and returns structured data with UI preview. Does NOT create database records - user must click Import button. Call this once and it handles everything.",
        inputSchema: z.object({
          raw_text: z.string().describe("The raw text content of the syllabus"),
          course_code: z
            .string()
            .optional()
            .describe("Optional course code if already known"),
        }),
        execute: async ({ raw_text }) => {
          const startTime = Date.now();
          console.log("[parse_syllabus] Starting syllabus parsing...");

          // Optimize: Truncate very long syllabus text (LLMs struggle with >100K chars)
          // Focus on assessment sections by keeping most relevant parts
          const MAX_TEXT_LENGTH = 100000;
          const syllabusText =
            raw_text.length > MAX_TEXT_LENGTH
              ? raw_text.substring(0, MAX_TEXT_LENGTH) +
                "\n\n[Note: Syllabus truncated for faster processing...]"
              : raw_text;

          console.log(
            "[parse_syllabus] Syllabus text length:",
            syllabusText.length,
            "characters",
          );

          // Build context about existing courses
          const existingCoursesContext =
            userCourses.length > 0
              ? `EXISTING COURSES (use these exact codes if syllabus matches one of them):
${userCourses.map((c) => `- ${c.code}: ${c.name}`).join("\n")}`
              : "No existing courses.";

          // Get semester date range for recurring task expansion
          const currentSemester = currentSemesterId
            ? await db
                .select({
                  startDate: semesters.startDate,
                  endDate: semesters.endDate,
                })
                .from(semesters)
                .where(eq(semesters.id, currentSemesterId))
                .limit(1)
            : [];

          const semesterStart = currentSemester[0]?.startDate
            ? new Date(currentSemester[0].startDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
          const semesterEnd = currentSemester[0]?.endDate
            ? new Date(currentSemester[0].endDate).toISOString().split("T")[0]
            : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0];

          // Parse syllabus into structured data (using faster model for extraction)
          console.log("[parse_syllabus] Starting syllabus extraction...");

          const parsePromise = generateText({
            // @ts-expect-error OpenRouter provider types are incompatible with AI SDK beta
            model: glmFast,
            temperature: 0.1, // Lower temperature for more consistent parsing
            maxSteps: 3, // Limit reasoning steps for speed
            output: Output.object({
              schema: z.object({
                course: z
                  .string()
                  .describe(
                    "Course code e.g. CSC108. MUST match an existing course code if one exists for this course.",
                  ),
                tasks: z.array(
                  z.object({
                    title: z
                      .string()
                      .describe("Name of the assignment, exam, or task"),
                    weight: z
                      .number()
                      .describe(
                        "Grade weight as a percentage (e.g., 10 for 10%)",
                      ),
                    due_date: z
                      .string()
                      .describe(
                        "Due date in ISO format YYYY-MM-DD. If no specific date is given, estimate based on context. For recurring events, note the pattern (e.g., 'Weekly Sundays'). If truly unknown, use empty string.",
                      ),
                    type: z
                      .string()
                      .describe(
                        "Category: Assignment, Quiz, Midterm, Final, Project, Lab, etc.",
                      ),
                  }),
                ),
              }),
            }),
            prompt: `Extract all graded tasks, assignments, exams, and assessments from this syllabus.

${existingCoursesContext}

SEMESTER DATE RANGE: ${semesterStart} to ${semesterEnd}

RULES:
1. COURSE CODE: Use exact code if it matches existing courses.
2. due_date format: YYYY-MM-DD (e.g., "2025-02-15")
3. For recurring events (weekly, bi-weekly, monthly), just extract pattern with first date (e.g., "Weekly on Sundays starting 2025-01-12") - system will expand.
4. If no date, use empty string "".
5. Extract title, weight percentage, due date, and type accurately.

Today's date: ${new Date().toISOString().split("T")[0]}

Syllabus content:
${syllabusText}`,
          });

          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Syllabus parsing timeout")),
              60000,
            ),
          ) as Promise<never>;

          const { output: parsed } = await Promise.race([
            parsePromise,
            timeoutPromise,
          ]);

          console.log(
            "[parse_syllabus] Extraction complete, found",
            parsed.tasks.length,
            "tasks",
          );

          // Post-process: Expand recurring tasks (much faster than LLM)
          const expandedTasks: typeof parsed.tasks = [];

          for (const task of parsed.tasks) {
            // Check if this is a recurring task
            const recurringPatterns = [
              /weekly/i,
              /bi-weekly/i,
              /every other week/i,
              /monthly/i,
              /fortnightly/i,
            ];

            const isRecurring = recurringPatterns.some((pattern) =>
              pattern.test(task.due_date),
            );

            if (isRecurring && task.due_date) {
              // Extract the first date mentioned in the due_date field
              const dateMatch = task.due_date.match(/\d{4}-\d{2}-\d{2}/);

              if (dateMatch) {
                const firstDate = new Date(dateMatch[0]);
                const startDate = new Date(semesterStart);
                const endDate = new Date(semesterEnd);

                // Determine interval
                const isWeekly =
                  /weekly/i.test(task.due_date) && !/bi/i.test(task.due_date);
                const isBiWeekly =
                  /bi-weekly|every other week|fortnightly/i.test(task.due_date);
                const isMonthly = /monthly/i.test(task.due_date);

                // Expand tasks based on interval
                let currentDate = firstDate;
                let index = 1;
                const maxTasks = 50; // Safety limit

                while (
                  currentDate <= endDate &&
                  expandedTasks.length < maxTasks
                ) {
                  if (currentDate >= startDate) {
                    expandedTasks.push({
                      ...task,
                      title: `${task.title} #${index}`,
                      due_date: currentDate.toISOString().split("T")[0],
                    });
                    index++;
                  }

                  // Move to next occurrence
                  if (isMonthly) {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                  } else if (isBiWeekly) {
                    currentDate.setDate(currentDate.getDate() + 14);
                  } else {
                    // Weekly
                    currentDate.setDate(currentDate.getDate() + 7);
                  }
                }
              } else {
                // No date found, add as-is
                expandedTasks.push(task);
              }
            } else {
              // Not a recurring task, add as-is
              expandedTasks.push(task);
            }
          }

          // Update parsed with expanded tasks
          parsed.tasks = expandedTasks;

          // Update parsed with expanded tasks
          parsed.tasks = expandedTasks;

          console.log(
            "[parse_syllabus] After expansion:",
            expandedTasks.length,
            "tasks total",
          );

          // Generate UI metadata directly (no extra LLM call needed)
          const validTaskCount = parsed.tasks.filter(
            (t) => t.due_date && /^\d{4}-\d{2}-\d{2}/.test(t.due_date),
          ).length;
          const invalidCount = parsed.tasks.length - validTaskCount;

          const totalTime = Date.now() - startTime;
          console.log(`[parse_syllabus] Total time: ${totalTime}ms`);

          // Return composite result with both data and UI metadata
          return {
            // Core parsed data for the SyllabusPreviewCard
            course: parsed.course,
            tasks: parsed.tasks,
            // UI metadata - eliminates need for separate showSyllabus call
            ui: {
              preview: true,
              title: `Syllabus for ${parsed.course}`,
              taskCount: parsed.tasks.length,
              validTaskCount,
              invalidCount,
              summary:
                invalidCount > 0
                  ? `Found ${parsed.tasks.length} tasks (${invalidCount} missing dates)`
                  : `Found ${parsed.tasks.length} tasks`,
            },
          };
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
          let foundTasks: (typeof tasks.$inferSelect)[];
          if (currentSemesterId) {
            const semesterCourses = await db
              .select({ id: courses.id })
              .from(courses)
              .where(
                and(
                  eq(courses.userId, user.id),
                  eq(courses.semesterId, currentSemesterId),
                ),
              );
            const courseIds = semesterCourses.map((c) => c.id);
            foundTasks = await db
              .select()
              .from(tasks)
              .where(
                and(
                  eq(tasks.userId, user.id),
                  inArray(
                    tasks.courseId,
                    courseIds.length > 0 ? courseIds : [""],
                  ),
                  ilike(tasks.title, `%${task_name}%`),
                ),
              );
          } else {
            foundTasks = await db
              .select()
              .from(tasks)
              .where(
                and(
                  eq(tasks.userId, user.id),
                  ilike(tasks.title, `%${task_name}%`),
                ),
              );
          }

          // 2. Fallback: LLM Fuzzy Match
          if (foundTasks.length === 0) {
            let allTasks: { id: string; title: string }[];
            if (currentSemesterId) {
              const semesterCourses = await db
                .select({ id: courses.id })
                .from(courses)
                .where(
                  and(
                    eq(courses.userId, user.id),
                    eq(courses.semesterId, currentSemesterId),
                  ),
                );
              const courseIds = semesterCourses.map((c) => c.id);
              allTasks = await db
                .select({ id: tasks.id, title: tasks.title })
                .from(tasks)
                .where(
                  and(
                    eq(tasks.userId, user.id),
                    inArray(
                      tasks.courseId,
                      courseIds.length > 0 ? courseIds : [""],
                    ),
                  ),
                );
            } else {
              allTasks = await db
                .select({ id: tasks.id, title: tasks.title })
                .from(tasks)
                .where(eq(tasks.userId, user.id));
            }

            if (allTasks.length > 0) {
              const { output: match } = await generateText({
                // @ts-expect-error OpenRouter provider types are incompatible with AI SDK beta
                model: glmFast, // Use faster model for simple matching
                output: Output.object({
                  schema: z.object({ taskId: z.string().nullable() }),
                }),
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
          const { output: object } = await generateText({
            // @ts-expect-error OpenRouter provider types are incompatible with AI SDK beta
            model: glmFast, // Use faster model for structured extraction
            output: Output.object({
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
                    status: z
                      .enum(["Todo", "In Progress", "Done", "Submitted"])
                      .nullable()
                      .describe(
                        "Task status - use 'Done' if graded, 'Submitted' if submitted but not graded, 'Todo' for new tasks, or null if unknown",
                      ),
                    score_received: z
                      .number()
                      .nullable()
                      .describe(
                        "The score/grade received (as a number, e.g., 60 for 60%), or null if not graded",
                      ),
                    score_max: z
                      .number()
                      .nullable()
                      .describe(
                        "Maximum possible score (e.g., 100), or null to use default",
                      ),
                  }),
                ),
              }),
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
- Include location and time information in the description field
- Extract scores if provided (e.g., "60%" -> score_received: 60, score_max: 100)
- Set status to "Done" if the task has been graded, "Submitted" if submitted but not graded, "Todo" otherwise`,
          });

          const newTasks = [];
          for (const t of object.tasks) {
            // Look up the course by course code
            let courseId = null;
            if (t.course_code) {
              const course = await db
                .select({
                  id: courses.id,
                  userId: courses.userId,
                  semesterId: courses.semesterId,
                  code: courses.code,
                  name: courses.name,
                  color: courses.color,
                  goalGrade: courses.goalGrade,
                  createdAt: courses.createdAt,
                  syllabus: sql<string | null>`NULL`.as("syllabus"), // Exclude syllabus data
                })
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
                status: t.status || "Todo",
                scoreReceived: t.score_received
                  ? String(t.score_received)
                  : null,
                scoreMax: t.score_max ? String(t.score_max) : null,
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
          let unscheduled: (typeof tasks.$inferSelect)[];
          if (currentSemesterId) {
            const semesterCourses = await db
              .select({ id: courses.id })
              .from(courses)
              .where(
                and(
                  eq(courses.userId, user.id),
                  eq(courses.semesterId, currentSemesterId),
                ),
              );
            const courseIds = semesterCourses.map((c) => c.id);
            unscheduled = await db
              .select()
              .from(tasks)
              .where(
                and(
                  eq(tasks.userId, user.id),
                  inArray(
                    tasks.courseId,
                    courseIds.length > 0 ? courseIds : [""],
                  ),
                  isNull(tasks.doDate),
                  eq(tasks.status, "Todo"),
                ),
              );
          } else {
            unscheduled = await db
              .select()
              .from(tasks)
              .where(
                and(
                  eq(tasks.userId, user.id),
                  isNull(tasks.doDate),
                  eq(tasks.status, "Todo"),
                ),
              );
          }

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
          let highStakes: { id: string }[];
          if (currentSemesterId) {
            const semesterCourses = await db
              .select({ id: courses.id })
              .from(courses)
              .where(
                and(
                  eq(courses.userId, user.id),
                  eq(courses.semesterId, currentSemesterId),
                ),
              );
            const courseIds = semesterCourses.map((c) => c.id);
            highStakes = await db
              .select({ id: tasks.id })
              .from(tasks)
              .innerJoin(courses, eq(tasks.courseId, courses.id))
              .innerJoin(gradeWeights, eq(tasks.gradeWeightId, gradeWeights.id))
              .where(
                and(
                  eq(tasks.userId, user.id),
                  eq(tasks.status, "Todo"),
                  gte(gradeWeights.weightPercent, "15.00"),
                  inArray(courses.id, courseIds),
                ),
              );
          } else {
            highStakes = await db
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
          }

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
        description:
          "Get tasks due in a date range. Returns tasks with UI metadata for display.",
        inputSchema: z.object({
          start_date: z.string().describe("Start date in ISO format"),
          end_date: z.string().describe("End date in ISO format"),
        }),
        execute: async ({ start_date, end_date }) => {
          let scheduledTasks: (typeof tasks.$inferSelect)[];
          if (currentSemesterId) {
            const semesterCourses = await db
              .select({ id: courses.id })
              .from(courses)
              .where(
                and(
                  eq(courses.userId, user.id),
                  eq(courses.semesterId, currentSemesterId),
                ),
              );
            const courseIds = semesterCourses.map((c) => c.id);
            scheduledTasks = await db
              .select()
              .from(tasks)
              .where(
                and(
                  eq(tasks.userId, user.id),
                  inArray(
                    tasks.courseId,
                    courseIds.length > 0 ? courseIds : [""],
                  ),
                  gte(tasks.dueDate, new Date(start_date)),
                  lte(tasks.dueDate, new Date(end_date)),
                ),
              );
          } else {
            scheduledTasks = await db
              .select()
              .from(tasks)
              .where(
                and(
                  eq(tasks.userId, user.id),
                  gte(tasks.dueDate, new Date(start_date)),
                  lte(tasks.dueDate, new Date(end_date)),
                ),
              );
          }

          return {
            tasks: scheduledTasks,
            start_date,
            end_date,
            count: scheduledTasks.length,
          };
        },
      }),

      find_missing_data: tool({
        description: "Finds tasks missing weights or dates.",
        inputSchema: z.object({}),
        execute: async () => {
          let missing: (typeof tasks.$inferSelect)[];
          if (currentSemesterId) {
            const semesterCourses = await db
              .select({ id: courses.id })
              .from(courses)
              .where(
                and(
                  eq(courses.userId, user.id),
                  eq(courses.semesterId, currentSemesterId),
                ),
              );
            const courseIds = semesterCourses.map((c) => c.id);
            missing = await db
              .select()
              .from(tasks)
              .where(
                and(
                  eq(tasks.userId, user.id),
                  inArray(
                    tasks.courseId,
                    courseIds.length > 0 ? courseIds : [""],
                  ),
                  isNull(tasks.dueDate),
                ),
              );
          } else {
            missing = await db
              .select()
              .from(tasks)
              .where(and(eq(tasks.userId, user.id), isNull(tasks.dueDate)));
          }
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
            .select({
              id: courses.id,
              userId: courses.userId,
              semesterId: courses.semesterId,
              code: courses.code,
              name: courses.name,
              color: courses.color,
              goalGrade: courses.goalGrade,
              createdAt: courses.createdAt,
              syllabus: sql<string | null>`NULL`.as("syllabus"), // Exclude syllabus data
            })
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
      // 5. BULK UPDATE TASKS TOOL
      // -----------------------------------------------------------------------
      bulk_update_tasks: tool({
        description:
          "Searches for tasks matching criteria and updates them in bulk. Supports renaming with sequential numbering (use {n} placeholder), changing status/priority, modifying dates/times, updating scores, descriptions, and more. Examples: 'rename all online assignments to Assignment {n}', 'set all quizzes to high priority', 'update weekly prep due times to 5pm'.",
        inputSchema: z.object({
          search_query: z
            .string()
            .describe(
              "Search term to match task titles (e.g., 'weekly prep', 'assignment', 'quiz')",
            ),
          course_code: z
            .string()
            .optional()
            .describe("Filter by course code (e.g., 'CSC148')"),
          sort_by: z
            .enum(["due_date", "created_at", "title"])
            .optional()
            .describe(
              "Sort order for tasks before applying updates (important for sequential numbering). Defaults to 'due_date'.",
            ),
          sort_order: z
            .enum(["asc", "desc"])
            .optional()
            .describe("Sort direction. Defaults to 'asc'."),
          updates: z.object({
            // Title/rename support with {n} placeholder for sequential numbering
            title_template: z
              .string()
              .optional()
              .describe(
                "New title template. Use {n} for sequential number based on sort order (e.g., 'Assignment {n}' becomes 'Assignment 1', 'Assignment 2', etc.)",
              ),
            status: z
              .enum(["Todo", "In Progress", "Done"])
              .optional()
              .describe("New status for matched tasks"),
            priority: z
              .enum(["Low", "Medium", "High"])
              .optional()
              .describe("New priority for matched tasks"),
            description: z
              .string()
              .optional()
              .describe("New description for matched tasks"),
            // Score fields
            score_received: z
              .number()
              .nullable()
              .optional()
              .describe(
                "Score received (e.g., 85 for 85%). Use null to clear.",
              ),
            score_max: z
              .number()
              .optional()
              .describe("Maximum possible score (e.g., 100)"),
            // Grade weight assignment
            grade_weight_id: z
              .string()
              .nullable()
              .optional()
              .describe(
                "Grade weight ID to assign tasks to. Use null to unassign.",
              ),
            // Date/time modifications
            due_time: z
              .string()
              .optional()
              .describe(
                "Time to set on existing due dates in HH:MM format (e.g., '17:00' for 5pm). Only modifies the time, keeps the date.",
              ),
            due_date_offset_days: z
              .number()
              .optional()
              .describe(
                "Number of days to add/subtract from existing due dates (e.g., -1 to move 1 day earlier, 2 to move 2 days later)",
              ),
            do_time: z
              .string()
              .optional()
              .describe(
                "Time to set on existing do dates in HH:MM format (e.g., '09:00' for 9am)",
              ),
            do_date_offset_days: z
              .number()
              .optional()
              .describe(
                "Number of days to add/subtract from existing do dates",
              ),
          }),
        }),
        execute: async ({
          search_query,
          course_code,
          sort_by = "due_date",
          sort_order = "asc",
          updates,
        }) => {
          // Build where clause
          const conditions = [
            eq(tasks.userId, user.id),
            ilike(tasks.title, `%${search_query}%`),
          ];

          // Add current semester filter
          if (currentSemesterId) {
            const semesterCourses = await db
              .select({ id: courses.id })
              .from(courses)
              .where(
                and(
                  eq(courses.userId, user.id),
                  eq(courses.semesterId, currentSemesterId),
                ),
              );
            const courseIds = semesterCourses.map((c) => c.id);
            conditions.push(
              inArray(tasks.courseId, courseIds.length > 0 ? courseIds : [""]),
            );
          }

          // If course_code provided, find course first
          let courseInfo = null;
          if (course_code) {
            const foundCourse = await db
              .select({
                id: courses.id,
                code: courses.code,
                name: courses.name,
              })
              .from(courses)
              .where(
                and(
                  eq(courses.userId, user.id),
                  ilike(courses.code, `%${course_code}%`),
                ),
              )
              .limit(1);

            if (foundCourse.length === 0) {
              return {
                success: false,
                error: `No course found matching "${course_code}"`,
              };
            }
            courseInfo = foundCourse[0];
            conditions.push(eq(tasks.courseId, courseInfo.id));
          }

          // Find matching tasks
          let matchingTasks = await db
            .select()
            .from(tasks)
            .where(and(...conditions));

          if (matchingTasks.length === 0) {
            return {
              success: false,
              error: `No tasks found matching "${search_query}"${course_code ? ` in ${course_code}` : ""}`,
              searched_for: search_query,
              course_filter: course_code || null,
            };
          }

          // Sort tasks for sequential numbering
          matchingTasks = matchingTasks.sort((a, b) => {
            let comparison = 0;
            if (sort_by === "due_date") {
              const aDate = a.dueDate?.getTime() ?? 0;
              const bDate = b.dueDate?.getTime() ?? 0;
              comparison = aDate - bDate;
            } else if (sort_by === "created_at") {
              const aDate = a.createdAt?.getTime() ?? 0;
              const bDate = b.createdAt?.getTime() ?? 0;
              comparison = aDate - bDate;
            } else if (sort_by === "title") {
              comparison = (a.title ?? "").localeCompare(b.title ?? "");
            }
            return sort_order === "desc" ? -comparison : comparison;
          });

          // Prepare updates for each task
          const updatedTasks = [];
          const errors = [];

          for (let i = 0; i < matchingTasks.length; i++) {
            const task = matchingTasks[i];
            try {
              const taskUpdates: {
                title?: string;
                status?: string;
                priority?: string;
                description?: string | null;
                scoreReceived?: string | null;
                scoreMax?: string;
                gradeWeightId?: string | null;
                dueDate?: Date;
                doDate?: Date;
              } = {};

              // Apply title template with sequential numbering
              if (updates.title_template) {
                taskUpdates.title = updates.title_template.replace(
                  /\{n\}/gi,
                  String(i + 1),
                );
              }

              // Apply status update
              if (updates.status) {
                taskUpdates.status = updates.status;
              }

              // Apply priority update
              if (updates.priority) {
                taskUpdates.priority = updates.priority;
              }

              // Apply description update
              if (updates.description !== undefined) {
                taskUpdates.description = updates.description;
              }

              // Apply score updates
              if (updates.score_received !== undefined) {
                taskUpdates.scoreReceived =
                  updates.score_received === null
                    ? null
                    : String(updates.score_received);
              }
              if (updates.score_max !== undefined) {
                taskUpdates.scoreMax = String(updates.score_max);
              }

              // Apply grade weight assignment
              if (updates.grade_weight_id !== undefined) {
                taskUpdates.gradeWeightId = updates.grade_weight_id;
              }

              // Apply due date time modification (respects user's timezone)
              if (updates.due_time && task.dueDate) {
                const [hours, minutes] = updates.due_time
                  .split(":")
                  .map(Number);
                taskUpdates.dueDate = setTimeInTimezone(
                  task.dueDate,
                  hours,
                  minutes,
                  userTimezone,
                );
              }

              // Apply due date offset
              if (updates.due_date_offset_days && task.dueDate) {
                const newDueDate = taskUpdates.dueDate
                  ? new Date(taskUpdates.dueDate)
                  : new Date(task.dueDate);
                newDueDate.setDate(
                  newDueDate.getDate() + updates.due_date_offset_days,
                );
                taskUpdates.dueDate = newDueDate;
              }

              // Apply do date time modification (respects user's timezone)
              if (updates.do_time && task.doDate) {
                const [hours, minutes] = updates.do_time.split(":").map(Number);
                taskUpdates.doDate = setTimeInTimezone(
                  task.doDate,
                  hours,
                  minutes,
                  userTimezone,
                );
              }

              // Apply do date offset
              if (updates.do_date_offset_days && task.doDate) {
                const newDoDate = taskUpdates.doDate
                  ? new Date(taskUpdates.doDate)
                  : new Date(task.doDate);
                newDoDate.setDate(
                  newDoDate.getDate() + updates.do_date_offset_days,
                );
                taskUpdates.doDate = newDoDate;
              }

              // Only update if there are changes
              if (Object.keys(taskUpdates).length > 0) {
                await db
                  .update(tasks)
                  .set(taskUpdates)
                  .where(eq(tasks.id, task.id));

                updatedTasks.push({
                  id: task.id,
                  original_title: task.title,
                  new_title: taskUpdates.title,
                  changes: {
                    ...(taskUpdates.title && {
                      title: { from: task.title, to: taskUpdates.title },
                    }),
                    ...(taskUpdates.status && { status: taskUpdates.status }),
                    ...(taskUpdates.priority && {
                      priority: taskUpdates.priority,
                    }),
                    ...(taskUpdates.description !== undefined && {
                      description: taskUpdates.description,
                    }),
                    ...(taskUpdates.scoreReceived !== undefined && {
                      scoreReceived: taskUpdates.scoreReceived,
                    }),
                    ...(taskUpdates.scoreMax !== undefined && {
                      scoreMax: taskUpdates.scoreMax,
                    }),
                    ...(taskUpdates.gradeWeightId !== undefined && {
                      gradeWeightId: taskUpdates.gradeWeightId,
                    }),
                    ...(taskUpdates.dueDate && {
                      dueDate: {
                        from: task.dueDate?.toISOString(),
                        to: taskUpdates.dueDate.toISOString(),
                      },
                    }),
                    ...(taskUpdates.doDate && {
                      doDate: {
                        from: task.doDate?.toISOString(),
                        to: taskUpdates.doDate.toISOString(),
                      },
                    }),
                  },
                });
              }
            } catch (err) {
              errors.push({
                id: task.id,
                title: task.title,
                error: err instanceof Error ? err.message : "Unknown error",
              });
            }
          }

          return {
            success: true,
            summary: `Updated ${updatedTasks.length} of ${matchingTasks.length} tasks`,
            course: courseInfo
              ? { code: courseInfo.code, name: courseInfo.name }
              : null,
            search_query,
            updated_tasks: updatedTasks,
            errors: errors.length > 0 ? errors : undefined,
          };
        },
      }),

      // -----------------------------------------------------------------------
      // 6b. SEARCH TASKS TOOL
      // -----------------------------------------------------------------------
      search_tasks: tool({
        description:
          "Searches tasks with comprehensive filters. Returns tasks with course and grade weight details. Supports full-text search, status/priority filtering, date ranges, score filtering, natural language dates, and more. Use for queries like 'show overdue tasks', 'high priority due this week', 'completed CSC148 exams', 'submitted assignments', etc.",
        inputSchema: z.object({
          search_query: z
            .string()
            .optional()
            .describe("Full-text search in task title and description"),
          status: z
            .array(z.enum(["Todo", "In Progress", "Done"]))
            .optional()
            .describe("Filter by status(es). Can include multiple statuses."),
          priority: z
            .array(z.enum(["Low", "Medium", "High"]))
            .optional()
            .describe(
              "Filter by priority level(s). Can include multiple priorities.",
            ),
          course_code: z
            .string()
            .optional()
            .describe(
              "Filter by course code (fuzzy match for both code and name)",
            ),
          grade_weight_id: z
            .string()
            .optional()
            .describe("Filter by specific grade weight ID"),
          has_due_date: z
            .boolean()
            .optional()
            .describe("Filter tasks that have/don't have due dates"),
          due_date_from: z
            .string()
            .optional()
            .describe(
              "Start date filter (ISO format YYYY-MM-DD or natural language like 'today', 'this week')",
            ),
          due_date_to: z
            .string()
            .optional()
            .describe(
              "End date filter (ISO format YYYY-MM-DD or natural language like 'next Friday')",
            ),
          has_do_date: z
            .boolean()
            .optional()
            .describe("Filter tasks that have/don't have do dates"),
          do_date_from: z
            .string()
            .optional()
            .describe(
              "Start do-date filter (ISO format YYYY-MM-DD or natural language)",
            ),
          do_date_to: z
            .string()
            .optional()
            .describe(
              "End do-date filter (ISO format YYYY-MM-DD or natural language)",
            ),
          is_submitted: z
            .boolean()
            .optional()
            .describe(
              "Filter submitted tasks (status=Done AND completedAt IS NOT NULL)",
            ),
          has_score: z
            .boolean()
            .optional()
            .describe("Filter tasks that have/don't have scores"),
          min_score: z
            .number()
            .optional()
            .describe(
              "Minimum score percentage (0-100). Filters by calculated percentage.",
            ),
          max_score: z
            .number()
            .optional()
            .describe(
              "Maximum score percentage (0-100). Filters by calculated percentage.",
            ),
          is_overdue: z
            .boolean()
            .optional()
            .describe(
              "Filter overdue tasks (due date < today AND status != Done)",
            ),
          sort_by: z
            .enum([
              "due_date",
              "do_date",
              "created_at",
              "title",
              "priority",
              "status",
            ])
            .optional()
            .describe("Sort field (default: due_date)"),
          sort_order: z
            .enum(["asc", "desc"])
            .optional()
            .describe("Sort direction (default: asc)"),
          limit: z
            .number()
            .min(1)
            .max(50)
            .optional()
            .describe("Maximum results to return (default: 20, max: 50)"),
        }),
        execute: async ({
          search_query,
          status,
          priority,
          course_code,
          grade_weight_id,
          has_due_date,
          due_date_from,
          due_date_to,
          has_do_date,
          do_date_from,
          do_date_to,
          is_submitted,
          has_score,
          min_score,
          max_score,
          is_overdue,
          sort_by = "due_date",
          sort_order = "asc",
          limit = 20,
        }) => {
          console.log("[search_tasks] Searching tasks with filters:", {
            search_query,
            status,
            priority,
            course_code,
            limit,
          });

          // Build base conditions
          const conditions = [eq(tasks.userId, user.id)];

          // Add current semester filter
          if (currentSemesterId) {
            const semesterCourses = await db
              .select({ id: courses.id })
              .from(courses)
              .where(
                and(
                  eq(courses.userId, user.id),
                  eq(courses.semesterId, currentSemesterId),
                ),
              );
            const courseIds = semesterCourses.map((c) => c.id);
            conditions.push(
              inArray(tasks.courseId, courseIds.length > 0 ? courseIds : [""]),
            );
          }

          // Handle course code fuzzy matching
          if (course_code) {
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

              if (coursesByName.length > 0) {
                const matchedCourseIds = coursesByName.map((c) => c.id);
                conditions.push(inArray(tasks.courseId, matchedCourseIds));
              } else {
                // Return empty result if no course matches
                return {
                  tasks: [],
                  count: 0,
                  filters_applied: { course_code },
                  message: `No courses found matching "${course_code}"`,
                  ui: {
                    type: "info",
                    title: "No Courses Found",
                    icon: "search-x",
                  },
                };
              }
            } else {
              const matchedCourseIds = foundCourses.map((c) => c.id);
              conditions.push(inArray(tasks.courseId, matchedCourseIds));
            }
          }

          // Full-text search in title and description
          if (search_query) {
            const searchCondition = sql`(
              ${ilike(tasks.title, `%${search_query}%`)} OR
              ${ilike(tasks.description, `%${search_query}%`)}
            )`;
            conditions.push(searchCondition);
          }

          // Status filter (multiple values allowed)
          if (status && status.length > 0) {
            conditions.push(inArray(tasks.status, status));
          }

          // Priority filter (multiple values allowed)
          if (priority && priority.length > 0) {
            conditions.push(inArray(tasks.priority, priority));
          }

          // Grade weight filter
          if (grade_weight_id) {
            conditions.push(eq(tasks.gradeWeightId, grade_weight_id));
          }

          // Due date presence filter
          if (has_due_date !== undefined) {
            if (has_due_date) {
              conditions.push(sql`${tasks.dueDate} IS NOT NULL`);
            } else {
              conditions.push(sql`${tasks.dueDate} IS NULL`);
            }
          }

          // Due date range filters (support natural language)
          if (due_date_from) {
            const parsedResult = chrono.parseDate(due_date_from, new Date(), {
              forwardDate: true,
            });
            const parsedDate = parsedResult as unknown as Array<{
              start?: { date?: Date | string };
            }>;
            const fromDate =
              parsedDate && parsedDate.length > 0 && parsedDate[0].start?.date
                ? parsedDate[0].start.date instanceof Date
                  ? parsedDate[0].start.date
                  : new Date(parsedDate[0].start.date as unknown as string)
                : new Date(due_date_from);
            conditions.push(gte(tasks.dueDate, fromDate));
          }

          if (due_date_to) {
            const parsedResult = chrono.parseDate(due_date_to, new Date(), {
              forwardDate: true,
            });
            const parsedDate = parsedResult as unknown as Array<{
              start?: { date?: Date | string };
            }>;
            const toDate =
              parsedDate && parsedDate.length > 0 && parsedDate[0].start?.date
                ? parsedDate[0].start.date instanceof Date
                  ? parsedDate[0].start.date
                  : new Date(parsedDate[0].start.date as unknown as string)
                : new Date(due_date_to);
            conditions.push(lte(tasks.dueDate, toDate));
          }

          // Do date presence filter
          if (has_do_date !== undefined) {
            if (has_do_date) {
              conditions.push(sql`${tasks.doDate} IS NOT NULL`);
            } else {
              conditions.push(sql`${tasks.doDate} IS NULL`);
            }
          }

          // Do date range filters (support natural language)
          if (do_date_from) {
            const parsedResult = chrono.parseDate(do_date_from, new Date(), {
              forwardDate: true,
            });
            const parsedDate = parsedResult as unknown as Array<{
              start?: { date?: Date | string };
            }>;
            const fromDate =
              parsedDate && parsedDate.length > 0 && parsedDate[0].start?.date
                ? parsedDate[0].start.date instanceof Date
                  ? parsedDate[0].start.date
                  : new Date(parsedDate[0].start.date as unknown as string)
                : new Date(do_date_from);
            conditions.push(gte(tasks.doDate, fromDate));
          }

          if (do_date_to) {
            const parsedResult = chrono.parseDate(do_date_to, new Date(), {
              forwardDate: true,
            });
            const parsedDate = parsedResult as unknown as Array<{
              start?: { date?: Date | string };
            }>;
            const toDate =
              parsedDate && parsedDate.length > 0 && parsedDate[0].start?.date
                ? parsedDate[0].start.date instanceof Date
                  ? parsedDate[0].start.date
                  : new Date(parsedDate[0].start.date as unknown as string)
                : new Date(do_date_to);
            conditions.push(lte(tasks.doDate, toDate));
          }

          // Submitted filter (status=Done AND completedAt IS NOT NULL)
          if (is_submitted !== undefined) {
            if (is_submitted) {
              conditions.push(
                sql`(${tasks.status} = 'Done' AND ${tasks.completedAt} IS NOT NULL)`,
              );
            } else {
              conditions.push(
                sql`(${tasks.status} != 'Done' OR ${tasks.completedAt} IS NULL)`,
              );
            }
          }

          // Score presence filter
          if (has_score !== undefined) {
            if (has_score) {
              conditions.push(sql`${tasks.scoreReceived} IS NOT NULL`);
            } else {
              conditions.push(sql`${tasks.scoreReceived} IS NULL`);
            }
          }

          // Score percentage filters
          if (min_score !== undefined || max_score !== undefined) {
            conditions.push(sql`${tasks.scoreReceived} IS NOT NULL`);
            if (min_score !== undefined) {
              conditions.push(
                sql`CAST(${tasks.scoreReceived} AS DECIMAL) / NULLIF(CAST(${tasks.scoreMax} AS DECIMAL), 0) * 100 >= ${min_score}`,
              );
            }
            if (max_score !== undefined) {
              conditions.push(
                sql`CAST(${tasks.scoreReceived} AS DECIMAL) / NULLIF(CAST(${tasks.scoreMax} AS DECIMAL), 0) * 100 <= ${max_score}`,
              );
            }
          }

          // Overdue filter
          if (is_overdue) {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            conditions.push(
              sql`${tasks.dueDate} < ${today} AND ${tasks.status} != 'Done'`,
            );
          }

          // Execute query with relations
          let results = await db.query.tasks.findMany({
            where: and(...conditions),
            with: {
              course: true,
              gradeWeight: true,
            },
          });

          // Apply client-side sorting for complex cases
          results = results.sort((a, b) => {
            let comparison = 0;

            // Priority sort order helper
            const priorityOrder = { High: 3, Medium: 2, Low: 1 };

            switch (sort_by) {
              case "due_date":
                const aDue = a.dueDate?.getTime() ?? Infinity;
                const bDue = b.dueDate?.getTime() ?? Infinity;
                comparison = aDue - bDue;
                break;
              case "do_date":
                const aDo = a.doDate?.getTime() ?? Infinity;
                const bDo = b.doDate?.getTime() ?? Infinity;
                comparison = aDo - bDo;
                break;
              case "created_at":
                const aCreated = a.createdAt?.getTime() ?? 0;
                const bCreated = b.createdAt?.getTime() ?? 0;
                comparison = aCreated - bCreated;
                break;
              case "title":
                comparison = (a.title ?? "").localeCompare(b.title ?? "");
                break;
              case "priority":
                comparison =
                  priorityOrder[a.priority as keyof typeof priorityOrder] -
                  priorityOrder[b.priority as keyof typeof priorityOrder];
                break;
              case "status":
                comparison = (a.status ?? "").localeCompare(b.status ?? "");
                break;
            }

            return sort_order === "desc" ? -comparison : comparison;
          });

          // Apply limit
          const limitedResults = results.slice(0, limit);

          // Calculate derived fields for display
          const enrichedResults = limitedResults.map((task) => {
            const isOverdue =
              task.dueDate &&
              task.status !== "Done" &&
              task.dueDate < new Date();
            const scorePercent =
              task.scoreReceived && task.scoreMax
                ? (parseFloat(task.scoreReceived) / parseFloat(task.scoreMax)) *
                  100
                : null;
            const daysUntilDue = task.dueDate
              ? Math.ceil(
                  (task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                )
              : null;

            return {
              ...task,
              _derived: {
                isOverdue,
                scorePercent,
                daysUntilDue,
                isSubmitted:
                  task.status === "Done" && task.completedAt !== null,
              },
            };
          });

          // Build summary
          const summaryParts = [];
          if (search_query) summaryParts.push(`matching "${search_query}"`);
          if (status?.length)
            summaryParts.push(`with status ${status.join(", ")}`);
          if (priority?.length)
            summaryParts.push(`with priority ${priority.join(", ")}`);
          if (course_code) summaryParts.push(`in ${course_code}`);
          if (is_overdue) summaryParts.push("that are overdue");
          if (is_submitted) summaryParts.push("that have been submitted");

          const summary =
            summaryParts.length > 0
              ? `Found ${limitedResults.length} task${limitedResults.length !== 1 ? "s" : ""} ${summaryParts.join(", ")}`
              : `Found ${limitedResults.length} task${limitedResults.length !== 1 ? "s" : ""}`;

          return {
            tasks: enrichedResults,
            count: limitedResults.length,
            total_count: results.length,
            filters_applied: {
              search_query,
              status,
              priority,
              course_code,
              grade_weight_id,
              has_due_date,
              due_date_from,
              due_date_to,
              has_do_date,
              do_date_from,
              do_date_to,
              is_submitted,
              has_score,
              min_score,
              max_score,
              is_overdue,
              sort_by,
              sort_order,
              limit,
            },
            summary,
            ui: {
              type: limitedResults.length > 0 ? "success" : "info",
              title: `${limitedResults.length} Task${limitedResults.length !== 1 ? "s" : ""} Found`,
              icon: limitedResults.length > 0 ? "search-check" : "search-x",
            },
          };
        },
      }),

      // -----------------------------------------------------------------------
      // 7. COURSE CONTEXT RETRIEVAL TOOL (RAG)
      // -----------------------------------------------------------------------
      retrieve_course_context: tool({
        description:
          "Searches course documents (syllabus, notes, slides, etc.) using semantic retrieval. Use this when answering questions about course materials, policies, deadlines, or specific course information. Returns relevant text chunks with source information.",
        inputSchema: z.object({
          query: z.string().describe("The search query for course documents"),
          course_code: z
            .string()
            .optional()
            .describe(
              "Optional course code to filter results. If not provided, uses the course from the current page context or searches all courses.",
            ),
          top_k: z
            .number()
            .optional()
            .describe(
              "Number of results to return (default: 5). Increase for comprehensive searches.",
            ),
        }),
        execute: async ({ query, course_code, top_k }) => {
          console.log(
            "[retrieve_course_context] Searching documents for:",
            query,
          );

          let courseId = null;

          if (course_code) {
            console.log(
              "[retrieve_course_context] Looking up course:",
              course_code,
            );
            const course = await db
              .select({ id: courses.id })
              .from(courses)
              .where(
                and(
                  eq(courses.userId, user.id),
                  ilike(courses.code, course_code),
                ),
              )
              .limit(1);

            if (course.length > 0) {
              courseId = course[0].id;
              console.log(
                "[retrieve_course_context] Found course:",
                course_code,
              );
            }
          } else if (pageContext?.type === "course") {
            courseId = pageContext.id;
          }

          console.log(
            "[retrieve_course_context] Searching in database with RRF...",
          );

          const searchResults = await searchDocumentsWithRRF({
            query,
            courseId: courseId || undefined,
            topK: top_k || 10, // Increased from 5 to 10
          });

          console.log(
            "[retrieve_course_context] Search complete, found:",
            searchResults.results.length,
            "documents",
          );

          if (searchResults.results.length === 0) {
            return {
              found: 0,
              message:
                "No relevant documents found. Try uploading course documents (syllabus, notes, etc.) or rephrasing your question.",
              ui: {
                type: "info",
                title: "No Documents Found",
                icon: "file-search",
              },
            };
          }

          const formattedResults = searchResults.results.map((result) => ({
            chunk_number: result.chunkIndex + 1,
            file_name: result.fileName,
            document_type: result.documentType,
            content: result.content,
            similarity: result.rrfScore
              ? (result.rrfScore * 100).toFixed(1)
              : (result.similarity * 100).toFixed(1),
          }));

          const strategyText =
            {
              simple: "adaptive retrieval",
              medium: "2-query retrieval",
              full: "multi-query retrieval",
            }[searchResults.strategy] || searchResults.strategy;

          const summary = `Found ${searchResults.results.length} relevant section${searchResults.results.length > 1 ? "s" : ""} from ${new Set(formattedResults.map((r) => r.file_name)).size} document${new Set(formattedResults.map((r) => r.file_name)).size > 1 ? "s" : ""}. (Using ${strategyText})`;

          return {
            found: searchResults.results.length,
            summary,
            results: formattedResults,
            ui: {
              type: "success",
              title: `Found ${searchResults.results.length} Document${searchResults.results.length > 1 ? "s" : ""}`,
              icon: "search",
            },
          };
        },
      }),

      // -----------------------------------------------------------------------
      // 6b. SAVE TO MEMORY TOOL (Document Storage)
      // -----------------------------------------------------------------------
      save_to_memory: tool({
        description:
          "Saves text content to the knowledge base for future retrieval. Use this when the user wants to remember any text information - course materials, reference documents, important notes, research findings, etc. The saved text will be chunked, embedded, and searchable later via 'retrieve_course_context'. This builds a persistent memory database.",
        inputSchema: z.object({
          text: z
            .string()
            .min(50, "Text must be at least 50 characters")
            .max(100000, "Text is too long (max 100,000 characters)")
            .describe("The raw text content to save to memory"),
          document_name: z
            .string()
            .min(1)
            .max(200)
            .describe(
              "A descriptive name for this document. Generate from content if not explicitly provided (e.g., 'Algorithm Notes', 'Project Requirements', 'Research Paper Summary')",
            ),
          course_code: z
            .string()
            .optional()
            .describe(
              "Optional course code to associate this document with. Only include if the content is course-specific. Use from page context if available, or infer from text content. Can be omitted for general knowledge.",
            ),
          document_type: z
            .enum(["syllabus", "notes", "other"])
            .default("other")
            .describe(
              "Type of document: 'syllabus' for course syllabi, 'notes' for lecture/study notes, 'other' for general documents and reference materials",
            ),
          description: z
            .string()
            .optional()
            .describe(
              "Brief description of what this document contains (optional)",
            ),
        }),
        execute: async ({
          text,
          document_name,
          course_code,
          document_type,
          description,
        }) => {
          console.log("[save_to_memory] Saving document:", document_name);

          // Resolve course from code or page context
          let courseId: string | undefined = undefined;
          let courseInfo: { code: string; name: string } | null = null;

          if (course_code) {
            console.log("[save_to_memory] Looking up course:", course_code);
            const course = await db
              .select()
              .from(courses)
              .where(
                and(
                  eq(courses.userId, user.id),
                  ilike(courses.code, course_code),
                ),
              )
              .limit(1);

            if (course.length === 0) {
              const availableCourses = userCourses
                .map((c) => c.code)
                .join(", ");
              return {
                success: false,
                error: `Course not found: ${course_code}. Available courses: ${availableCourses || "none"}`,
              };
            }

            courseId = course[0].id;
            courseInfo = { code: course[0].code, name: course[0].name || "" };
            console.log("[save_to_memory] Found course:", courseInfo);
          } else if (pageContext?.type === "course") {
            // Use course from page context
            courseId = pageContext.id;
            const contextCourse = userCourses.find((c) => c.id === courseId);
            if (contextCourse) {
              courseInfo = {
                code: contextCourse.code,
                name: contextCourse.name || "",
              };
              console.log(
                "[save_to_memory] Using course from page context:",
                courseInfo,
              );
            }
          }

          console.log("[save_to_memory] Calling saveTextDocument action...");

          // Call server action
          const result = await saveTextDocument({
            text,
            documentName: document_name,
            courseId,
            documentType: document_type,
            description,
          });

          if (!result.success) {
            console.error("[save_to_memory] Save failed:", result.message);
            return {
              success: false,
              error: result.message,
            };
          }

          console.log(
            "[save_to_memory] Successfully saved:",
            result.chunkCount,
            "chunks",
          );

          const courseText = courseInfo
            ? ` to ${courseInfo.code} (${courseInfo.name})`
            : "";

          return {
            success: true,
            saved: {
              document_name,
              file_name: result.fileName,
              chunk_count: result.chunkCount,
              course: courseInfo,
              document_type,
            },
            message: `Successfully saved "${document_name}" with ${result.chunkCount ?? 0} chunk${(result.chunkCount ?? 0) > 1 ? "s" : ""}${courseText}. You can now retrieve this information using retrieve_course_context.`,
            ui: {
              type: "success",
              title: "Saved to Memory",
              icon: "check",
            },
          };
        },
      }),

      // -----------------------------------------------------------------------
      // 7. WEB SEARCH & RESEARCH TOOLS (Tavily)
      // -----------------------------------------------------------------------
      web_search: tavilySearch({
        apiKey: tavilyApiKey,
        searchDepth: "advanced",
        includeAnswer: true,
        maxResults: 5,
        topic: "general",
      }),

      extract_content: tavilyExtract({
        apiKey: tavilyApiKey,
        extractDepth: "advanced",
        format: "markdown",
      }),

      crawl_website: tavilyCrawl({
        apiKey: tavilyApiKey,
        maxDepth: 2,
        limit: 50,
      }),

      map_website: tavilyMap({
        apiKey: tavilyApiKey,
        maxDepth: 1,
        limit: 50,
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
