"use client";

import { useCourseData } from "@/hooks/use-course-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CourseStrategySidebar } from "@/components/dashboard/course-strategy-sidebar";
import { TaskExplorer } from "@/components/tasks/task-explorer";
import { QuickAddCourseTask } from "@/components/dashboard/quick-add-course-task";
import { EditCourseDialog } from "@/components/courses/edit-course-dialog";

interface CoursePageContentProps {
  courseId: string;
}

export function CoursePageContent({ courseId }: CoursePageContentProps) {
  const { data: course, isLoading } = useCourseData(courseId);

  if (isLoading || !course) {
    return <div>Loading...</div>;
  }

  // Calculate Current Grade
  let totalWeightedScore = 0;
  let totalWeightDecided = 0;

  // Map tasks to weights logic (similar to sidebar, but for display)
  const tasksByWeight: Record<string, typeof course.tasks> = {};
  course.tasks.forEach((task) => {
    if (task.gradeWeightId) {
      if (!tasksByWeight[task.gradeWeightId]) {
        tasksByWeight[task.gradeWeightId] = [];
      }
      tasksByWeight[task.gradeWeightId].push(task);
    }
  });

  course.grade_weights.forEach((gw) => {
    const gwTasks = tasksByWeight[gw.id] || [];
    const totalTasksInGw = gwTasks.length;
    const weightPercent = parseFloat(gw.weightPercent?.toString() || "0");

    if (totalTasksInGw > 0) {
      const weightPerTask = weightPercent / totalTasksInGw;

      gwTasks.forEach((task) => {
        if (task.scoreReceived !== null) {
          totalWeightDecided += weightPerTask;
          const score = parseFloat(task.scoreReceived.toString());
          const max = parseFloat(task.scoreMax?.toString() || "100");
          const percentage = max > 0 ? score / max : 0;
          totalWeightedScore += percentage * weightPerTask;
        }
      });
    }
  });

  const currentGrade =
    totalWeightDecided > 0
      ? (totalWeightedScore / totalWeightDecided) * 100
      : 100;

  const goalGrade = parseFloat(course.goalGrade?.toString() || "85");
  const isBelowGoal = currentGrade < goalGrade;

  return (
    <div className="py-2 h-auto lg:h-[calc(100vh-4rem)] flex flex-col space-y-6">
      {/* Header */}
      <Card
        className="shrink-0 border-t-4 shadow-sm py-2"
        style={{
          borderTopColor: course.color || "#000",
        }}
      >
        <CardContent className="p-4 lg:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight wrap-break-word">
                {course.code}{" "}
                <span className="text-muted-foreground font-normal lg:ml-2 block lg:inline">
                  {course.name}
                </span>
                <div className="flex items-center gap-2 w-full">
                  <Progress
                    value={totalWeightDecided || 0}
                    style={{
                      backgroundColor: "#000",
                    }}
                    barClassName="w-full h-2"
                    barStyle={{ backgroundColor: course.color || "#000" }}
                  />
                  <span className="text-sm font-medium">
                    {totalWeightDecided.toFixed(0)}%
                  </span>
                </div>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-left lg:text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Current Grade
                </div>
                <div
                  className={`text-3xl font-bold ${isBelowGoal ? "text-yellow-500" : "text-foreground"}`}
                >
                  {totalWeightDecided > 0
                    ? currentGrade.toFixed(1) + "%"
                    : "N/A"}
                </div>
              </div>

              <div className="hidden lg:block h-10 w-px bg-border mx-2" />

              <Badge variant="outline" className="text-sm py-1 px-3">
                Goal: {goalGrade}%
              </Badge>
            </div>
          </div>

          {/* Edit Button */}
          <div className="flex items-center gap-2">
            <EditCourseDialog course={course} />
          </div>
        </CardContent>
      </Card>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-2 flex-1 min-h-0">
        {/* Left Column: Tasks */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 border-none shadow-none bg-transparent">
            <CardContent className="p-0 flex-1 flex flex-col min-h-0">
              <QuickAddCourseTask
                courseId={course.id}
                courseCode={course.code}
              />
              <div className="flex-1 min-h-0 overflow-y-auto">
                <TaskExplorer
                  tasks={course.tasks}
                  storageKey={`course-tasks-table-${course.id}`}
                  context={{ type: "course", id: course.id }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Strategy + Notes */}
        <div className="lg:col-span-1 overflow-y-auto pr-1">
          <CourseStrategySidebar course={course} />
        </div>
      </div>
    </div>
  );
}
