import { getUserSchedule } from "@/actions/schedule";
import { getUserCourses } from "@/actions/courses";
import { ScheduleManager } from "@/components/schedule/schedule-manager";
import { ScheduleData } from "@/types";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schedule | Student OS",
  description: "View and manage your course schedule and timetable",
};

export default async function SchedulePage() {
  let coursesWithSchedule: {
    id: string;
    code: string;
    name: string | null;
    color: string | null;
    schedule: ScheduleData | null;
  }[] = [];
  let allCoursesSimple: {
    id: string;
    code: string;
    name: string | null;
  }[] = [];
  let error: Error | null = null;

  try {
    const [{ courses: scheduledCourses }, allCourses] = await Promise.all([
      getUserSchedule(),
      getUserCourses(),
    ]);

    coursesWithSchedule = scheduledCourses.map((course) => ({
      id: course.id,
      code: course.code,
      name: course.name,
      color: course.color,
      schedule: course.schedule,
    }));

    allCoursesSimple = allCourses.map((course) => ({
      id: course.id,
      code: course.code,
      name: course.name,
    }));
  } catch (err) {
    console.error("Error loading schedule:", err);
    error = err instanceof Error ? err : new Error("An unknown error occurred");
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h2 className="text-lg font-semibold text-destructive">
          Error loading schedule
        </h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <ScheduleManager
      initialCourses={coursesWithSchedule}
      allCourses={allCoursesSimple}
    />
  );
}
