import { getCourseData } from "@/actions/get-course-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import { CourseStrategySidebar } from "@/components/dashboard/course-strategy-sidebar";
import { TaskExplorer } from "@/components/tasks/task-explorer";
import { columns } from "@/components/tasks/columns";
import { QuickAddCourseTask } from "@/components/dashboard/quick-add-course-task";
import { EditCourseDialog } from "@/components/courses/edit-course-dialog";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { id } = await params;
  const course = await getCourseData(id);

  if (!course) {
    notFound();
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
      : 100; // Default to 100 if nothing graded yet? Or 0? Usually "N/A" or 100 until proven otherwise.

  const goalGrade = parseFloat(course.goalGrade?.toString() || "85");
  const isBelowGoal = currentGrade < goalGrade;

  return (
    <div className="py-2 h-[calc(100vh-4rem)] flex flex-col space-y-6">
      {/* Header */}
      <Card
        className="shrink-0 border-t-4 shadow-sm py-2"
        style={{ borderTopColor: course.color || "#000" }}
      >
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {course.code}{" "}
                <span className="text-muted-foreground font-normal ml-2">
                  {course.name}
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
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

              <div className="h-10 w-px bg-border mx-2" />

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Column: Tasks */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 border-none shadow-none bg-transparent">
            <CardContent className="p-0 flex-1 flex flex-col min-h-0">
              <QuickAddCourseTask
                courseId={course.id}
                courseCode={course.code}
              />
              <div className="flex-1 min-h-0">
                <TaskExplorer
                  tasks={course.tasks}
                  storageKey={`course-tasks-table-${course.id}`}
                  context={{ type: "course", id: course.id }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Strategy */}
        <div className="lg:col-span-1 overflow-y-auto pr-1">
          <CourseStrategySidebar course={course} />
        </div>
      </div>
    </div>
  );
}
