"use server";

import { db } from "@/drizzle";
import { semesters, courses } from "@/schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import {
  addDays,
  differenceInCalendarWeeks,
  differenceInDays,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";

export interface DashboardMetrics {
  gradeGap: {
    courseId: string;
    courseName: string;
    courseCode: string;
    currentGrade: number;
    goalGrade: number | null;
    maxPossibleGrade: number;
    requiredPerformance: number | null; // Null if no goal or impossible/done
    isImpossible: boolean;
  }[];
  workloadHeatmap: {
    date: string;
    taskCount: number;
    totalWeight: number;
  }[];
  highStakesTasks: {
    id: string;
    title: string;
    courseName: string;
    courseCode: string;
    dueDate: string | null;
    weight: number;
    priority: string;
  }[];
  semesterProgress: {
    percentage: number;
    weekNumber: number;
    totalWeeks: number;
    isOnBreak: boolean; // Placeholder for future
  };
}

export async function getDashboardMetrics(
  semesterId: string,
): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 1. Fetch Semester Details
  const semester = await db.query.semesters.findFirst({
    where: and(eq(semesters.id, semesterId), eq(semesters.userId, user.id)),
  });

  if (!semester) {
    throw new Error("Semester not found");
  }

  // 2. Fetch Courses with Grade Weights and Tasks (exclude syllabus)
  const coursesData = await db.query.courses.findMany({
    where: and(eq(courses.semesterId, semesterId), eq(courses.userId, user.id)),
    columns: {
      id: true,
      userId: true,
      semesterId: true,
      code: true,
      name: true,
      color: true,
      goalGrade: true,
      createdAt: true,
      syllabus: false, // Explicitly exclude syllabus
    },
    with: {
      gradeWeights: true,
      tasks: true,
    },
  });

  const now = new Date();
  const today = startOfDay(now);
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const next14DaysEnd = addDays(today, 14);

  const gradeGap: DashboardMetrics["gradeGap"] = [];
  const workloadMap = new Map<string, { count: number; weight: number }>();
  const highStakes: DashboardMetrics["highStakesTasks"] = [];

  // Initialize heatmap
  next7Days.forEach((d) => {
    workloadMap.set(d.toISOString().split("T")[0], { count: 0, weight: 0 });
  });

  // Process Courses
  for (const course of coursesData) {
    // Organize tasks by grade_weight_id
    const tasksByWeight = new Map<string, typeof course.tasks>();
    const unweightedTasks: typeof course.tasks = [];

    course.tasks.forEach((t) => {
      if (t.gradeWeightId) {
        const existing = tasksByWeight.get(t.gradeWeightId) || [];
        existing.push(t);
        tasksByWeight.set(t.gradeWeightId, existing);
      } else {
        unweightedTasks.push(t);
      }
    });

    // Calculate Grade Metrics
    let totalEarnedWeight = 0;
    let totalPossibleWeightSoFar = 0;
    let totalLostWeight = 0;

    course.gradeWeights.forEach((gw) => {
      const tasksInGw = tasksByWeight.get(gw.id) || [];
      const weightPerTask =
        tasksInGw.length > 0 ? Number(gw.weightPercent) / tasksInGw.length : 0;

      tasksInGw.forEach((task) => {
        const isGraded = task.scoreReceived !== null;
        const score = Number(task.scoreReceived || 0);
        const max = Number(task.scoreMax || 100);
        const percent = max > 0 ? score / max : 0;

        if (isGraded) {
          totalEarnedWeight += percent * weightPerTask;
          totalPossibleWeightSoFar += weightPerTask;
          totalLostWeight += (1 - percent) * weightPerTask;
        } else {
          // totalRemainingWeight += weightPerTask; // kept implicitly
        }

        // Check for High Stakes (Upcoming 14 days)
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          if (isAfter(dueDate, today) && isBefore(dueDate, next14DaysEnd)) {
            if (weightPerTask > 10 || task.priority === "High") {
              highStakes.push({
                id: task.id,
                title: task.title,
                courseName: course.name || course.code,
                courseCode: course.code,
                dueDate: task.dueDate.toISOString(),
                weight: weightPerTask,
                priority: task.priority || "Medium",
              });
            }
          }

          // Add to Heatmap (Next 7 days)
          const dateKey = dueDate.toISOString().split("T")[0];
          if (workloadMap.has(dateKey)) {
            const entry = workloadMap.get(dateKey)!;
            entry.count += 1;
            entry.weight += weightPerTask;
            workloadMap.set(dateKey, entry);
          }
        }
      });

      if (tasksInGw.length === 0) {
        // totalRemainingWeight += Number(gw.weightPercent);
      }
    });

    // Current Grade: Scaled to 100 based on what's done
    const currentGrade =
      totalPossibleWeightSoFar > 0
        ? (totalEarnedWeight / totalPossibleWeightSoFar) * 100
        : 100; // Default to 100 if nothing done

    const maxPossibleGrade = 100 - totalLostWeight;

    // Required Performance
    let requiredPerformance: number | null = null;
    let isImpossible = false;

    if (course.goalGrade) {
      const goal = Number(course.goalGrade);
      const weightRemaining = 100 - totalPossibleWeightSoFar;

      if (weightRemaining > 0) {
        const needed = (goal - totalEarnedWeight) / weightRemaining;
        requiredPerformance = needed * 100;
        if (requiredPerformance > 100) isImpossible = true;
        if (requiredPerformance < 0) requiredPerformance = 0;
      } else {
        if (currentGrade < goal) isImpossible = true;
        requiredPerformance = 0;
      }
    }

    gradeGap.push({
      courseId: course.id,
      courseName: course.name || course.code,
      courseCode: course.code,
      currentGrade: Math.round(currentGrade * 10) / 10,
      goalGrade: course.goalGrade ? Number(course.goalGrade) : null,
      maxPossibleGrade: Math.round(maxPossibleGrade * 10) / 10,
      requiredPerformance:
        requiredPerformance !== null
          ? Math.round(requiredPerformance * 10) / 10
          : null,
      isImpossible,
    });
  }

  // 4. Semester Progress
  const start = new Date(semester.startDate);
  const end = new Date(semester.endDate);
  const totalDuration = differenceInDays(end, start);
  const elapsed = differenceInDays(now, start);

  let progressPercent = 0;
  if (totalDuration > 0) {
    progressPercent = Math.min(
      100,
      Math.max(0, (elapsed / totalDuration) * 100),
    );
  }

  // Calculate week number
  const weekNumber = Math.max(
    1,
    differenceInCalendarWeeks(now, start, { weekStartsOn: 1 }) + 1,
  );
  const totalWeeks =
    differenceInCalendarWeeks(end, start, { weekStartsOn: 1 }) + 1;

  const workloadHeatmap = Array.from(workloadMap.entries())
    .map(([date, data]) => ({
      date,
      taskCount: data.count,
      totalWeight: data.weight,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    gradeGap,
    workloadHeatmap,
    highStakesTasks: highStakes.sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    }),
    semesterProgress: {
      percentage: Math.round(progressPercent),
      weekNumber,
      totalWeeks,
      isOnBreak: false,
    },
  };
}
