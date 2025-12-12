import { getSemesterData } from "@/actions/semesters";
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
import { Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default async function SemesterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const semester = await getSemesterData(id);

  if (!semester) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{semester.name}</h1>
          <p className="text-muted-foreground">
            {format(new Date(semester.startDate), "MMM d, yyyy")} -{" "}
            {format(new Date(semester.endDate), "MMM d, yyyy")}
          </p>
        </div>
        <Link href={`/semesters/${semester.id}/courses/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Course
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm mt-2">
                  {course.name}
                </CardDescription>
                {course.goalGrade && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Goal: {course.goalGrade}%
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {semester.courses.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg border-dashed">
            No courses added yet. Click &quot;Add Course&quot; to get started.
          </div>
        )}
      </div>
    </div>
  );
}
