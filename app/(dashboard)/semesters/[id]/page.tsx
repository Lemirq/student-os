import { getSemesterData } from "@/actions/semesters";
import { getDashboardMetrics } from "@/actions/dashboard";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { DataTable } from "@/components/tasks/data-table";
import { columns } from "@/components/tasks/columns";
import { SemesterProgress } from "@/components/dashboard/semester-progress";
import { GradeGapCard } from "@/components/dashboard/grade-gap-card";
import { WorkloadHeatmap } from "@/components/dashboard/workload-heatmap";
import { HighStakesList } from "@/components/dashboard/high-stakes-list";
import { EditSemesterDialog } from "@/components/semesters/edit-semester-dialog";
// import { QuickCapture } from "@/components/dashboard/quick-capture";

// Helper to format date-only strings correctly without timezone issues
function formatDateOnly(dateStr: string): string {
  // Parse YYYY-MM-DD as local date
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return format(date, "MMM d, yyyy");
}

export default async function SemesterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Parallel data fetching
  const [semester, metrics] = await Promise.all([
    getSemesterData(id),
    getDashboardMetrics(id),
  ]);

  if (!semester) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{semester.name}</h1>
          <p className="text-muted-foreground">
            {formatDateOnly(semester.startDate)} -{" "}
            {formatDateOnly(semester.endDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <EditSemesterDialog semester={semester} />
          <Link href={`/semesters/${semester.id}/courses/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Course
            </Button>
          </Link>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 max-h-[500px] grid-rows-3 gap-4">
        {/* Top Row: Progress & Quick Capture */}
        <div className="md:col-span-8 row-span-1">
          <SemesterProgress data={metrics.semesterProgress} />
        </div>
        {/* <div className="md:col-span-4 row-span-2">
           <QuickCapture />
        </div> */}

        {/* Middle Row: Heatmap, Grade Gap, High Stakes */}
        <div className="md:col-span-4 md:row-span-3 h-full">
          <GradeGapCard data={metrics.gradeGap} />
        </div>
        <div className="md:col-span-4 md:row-span-2 h-full">
          <WorkloadHeatmap data={metrics.workloadHeatmap} />
        </div>
        <div className="md:col-span-4 md:row-span-2 h-full">
          <HighStakesList tasks={metrics.highStakesTasks} />
        </div>
      </div>

      {/* Course Grid */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Courses</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {semester.courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: course.color || "#000000" }}
                      />
                      {course.code}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {course.name}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
          {semester.courses.length === 0 && (
            <div className="col-span-full text-center py-6 text-muted-foreground border rounded-lg border-dashed">
              No courses yet.
            </div>
          )}
        </div>
      </div>

      {/* Task Table */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">All Tasks</h2>
        <DataTable
          columns={columns}
          data={semester.tasks}
          storageKey={`semester-tasks-table-${semester.id}`}
        />
      </div>
    </div>
  );
}
