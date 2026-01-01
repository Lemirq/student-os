"use server";

import { db } from "@/drizzle";
import { tasks, courses, semesters, gradeWeights } from "@/schema";
import { eq, and, ilike } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import * as chrono from "chrono-node";

const importSyllabusSchema = z.object({
  course: z.string(),
  syllabusBody: z.string().optional(),
  tasks: z.array(
    z.object({
      title: z.string(),
      weight: z.number().optional(),
      due_date: z.string(),
      type: z.string(),
    }),
  ),
});

export async function importSyllabusTasks(
  data: z.infer<typeof importSyllabusSchema>,
) {
  // Validate the input data
  const validatedData = importSyllabusSchema.parse(data);

  // Filter out tasks with empty or invalid dates upfront
  const tasksWithDates = validatedData.tasks.filter(
    (task) => task.due_date && task.due_date.trim() !== "",
  );
  const tasksWithoutDates = validatedData.tasks.filter(
    (task) => !task.due_date || task.due_date.trim() === "",
  );

  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");

  const userId = user.user.id;

  // ============================================================================
  // STEP 1: CREATE OR FIND COURSE
  // ============================================================================

  // Find course by code for this user (case-insensitive)
  const existingCourses = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.userId, userId),
        ilike(courses.code, validatedData.course),
      ),
    )
    .limit(1);

  let course = existingCourses[0];

  // If course doesn't exist, create it in the current semester
  if (!course) {
    // Find the current semester for this user
    const currentSemester = await db
      .select()
      .from(semesters)
      .where(and(eq(semesters.userId, userId), eq(semesters.isCurrent, true)))
      .limit(1);

    if (currentSemester.length === 0) {
      throw new Error(
        `No current semester found. Please create a semester first before importing syllabi.`,
      );
    }

    // Create the course
    const newCourse = await db
      .insert(courses)
      .values({
        userId: userId,
        semesterId: currentSemester[0].id,
        code: validatedData.course,
        name: validatedData.course, // Use code as name initially
        color: "#3b82f6", // Default blue color
        syllabus: validatedData.syllabusBody,
      })
      .returning();

    course = newCourse[0];
  } else {
    // If course exists and we have syllabus body, update it
    if (validatedData.syllabusBody) {
      await db
        .update(courses)
        .set({ syllabus: validatedData.syllabusBody })
        .where(eq(courses.id, course.id));
    }
  }

  // ============================================================================
  // STEP 2: CREATE GRADE WEIGHTS
  // ============================================================================

  // Fetch existing grade weights for this course
  const existingGradeWeights = await db
    .select()
    .from(gradeWeights)
    .where(eq(gradeWeights.courseId, course.id));

  // Map to store weight IDs: key = `${name}-${weight}`
  const weightMap = new Map<string, string>();
  existingGradeWeights.forEach((gw) => {
    weightMap.set(`${gw.name}-${parseFloat(gw.weightPercent || "0")}`, gw.id);
  });

  // Identify needed weights
  const neededWeights = new Map<string, { name: string; weight: number }>();

  for (const task of validatedData.tasks) {
    if (task.weight !== undefined && task.weight !== null) {
      const key = `${task.type}-${task.weight}`;
      if (!weightMap.has(key)) {
        neededWeights.set(key, { name: task.type, weight: task.weight });
      }
    }
  }

  // Create missing grade weights
  if (neededWeights.size > 0) {
    const weightsToCreate = Array.from(neededWeights.values()).map((w) => ({
      courseId: course.id,
      name: w.name,
      weightPercent: w.weight.toString(),
    }));

    const createdWeights = await db
      .insert(gradeWeights)
      .values(weightsToCreate)
      .returning();

    createdWeights.forEach((gw) => {
      weightMap.set(`${gw.name}-${parseFloat(gw.weightPercent || "0")}`, gw.id);
    });
  }

  // ============================================================================
  // STEP 3: CREATE TASKS
  // ============================================================================

  // Build task records with proper date parsing and grade weight linking
  const invalidDateTasks: string[] = [];
  const tasksToInsert = validatedData.tasks
    .map((task) => {
      // Skip tasks with empty due dates
      if (!task.due_date || task.due_date.trim() === "") {
        invalidDateTasks.push(task.title);
        return null;
      }

      // Use chrono-node to parse date strings more robustly
      const parsedDate = chrono.parseDate(task.due_date);

      // Fallback to native Date if chrono fails (or if date string is standard ISO)
      const dueDate = parsedDate || new Date(task.due_date);

      let gradeWeightId = null;
      if (task.weight !== undefined && task.weight !== null) {
        const key = `${task.type}-${task.weight}`;
        gradeWeightId = weightMap.get(key) || null;
      }

      // Check if date is valid
      if (isNaN(dueDate.getTime())) {
        console.warn(
          `Invalid date found for task "${task.title}": ${task.due_date}. Skipping task.`,
        );
        invalidDateTasks.push(task.title);
        return null;
      }

      return {
        userId: userId,
        courseId: course.id,
        gradeWeightId: gradeWeightId,
        title: task.title,
        dueDate: dueDate,
        status: "Todo",
        priority: "Medium",
      };
    })
    .filter((task) => task !== null);

  // Only insert if we have valid tasks
  let insertedCount = 0;
  if (tasksToInsert.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(tasks).values(tasksToInsert as any);
    insertedCount = tasksToInsert.length;
  }

  // Invalidate cache for all modified tables
  await db.$cache.invalidate({ tables: [courses, gradeWeights, tasks] });

  // Return detailed results for toast notification
  return {
    success: insertedCount > 0,
    count: insertedCount,
    skippedCount: invalidDateTasks.length,
    skippedTasks: invalidDateTasks,
    courseCreated: !existingCourses[0], // true if course was newly created
    courseCode: validatedData.course,
    weightsCreated: neededWeights.size, // number of grade weights created
  };
}
