import { getCourseData } from "@/actions/get-course-data";
import { DataTable } from "@/components/tasks/data-table";
import { columns } from "@/components/tasks/columns";
import { AddGradeWeightForm } from "@/components/grade-weights/add-weight-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from "next/navigation";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await getCourseData(id);

  if (!course) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{course.code}</h1>
          <p className="text-muted-foreground">{course.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Shortcuts hint or other actions */}
          <CreateTaskModal
            courseId={course.id}
            gradeWeights={course.grade_weights}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {course.grade_weights.map((gw) => (
          <Card key={gw.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{gw.name}</CardTitle>
              <span className="text-muted-foreground">{gw.weightPercent}%</span>
            </CardHeader>
          </Card>
        ))}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Add Category</CardTitle>
          </CardHeader>
          <CardContent>
            <AddGradeWeightForm courseId={course.id} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tasks</h2>
        </div>
        <DataTable columns={columns} data={course.tasks} />
      </div>
    </div>
  );
}
