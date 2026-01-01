import { getUserSchedule } from "@/actions/schedule";
import { getUserCourses } from "@/actions/courses";
import { ScheduleManager } from "@/components/schedule/schedule-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule | Student OS",
  description: "View and manage your course schedule and timetable",
};

export default async function SchedulePage() {
  try {
    // Fetch courses with schedules and all courses in parallel
    const [{ courses: scheduledCourses }, allCourses] = await Promise.all([
      getUserSchedule(),
      getUserCourses(),
    ]);

    // Transform courses with schedules to match the expected type
    const coursesWithSchedule = scheduledCourses.map((course) => ({
      id: course.id,
      code: course.code,
      name: course.name,
      color: course.color,
      schedule: course.schedule,
    }));

    // Transform all courses to match the expected type
    const allCoursesSimple = allCourses.map((course) => ({
      id: course.id,
      code: course.code,
      name: course.name,
    }));

    return (
      <ScheduleManager
        initialCourses={coursesWithSchedule}
        allCourses={allCoursesSimple}
      />
    );
  } catch (error) {
    console.error("Error loading schedule:", error);
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h2 className="text-lg font-semibold text-destructive">
          Error loading schedule
        </h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "An unknown error occurred"}
        </p>
      </div>
    );
  }
}
