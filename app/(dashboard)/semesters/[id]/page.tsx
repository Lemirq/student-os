import { getSemesterData } from "@/actions/semesters";
import { getDashboardMetrics } from "@/actions/dashboard";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { EditSemesterDialog } from "@/components/semesters/edit-semester-dialog";
import { SemesterContent } from "@/components/semesters/semester-content";
import { StudyDebtWidget } from "@/components/insights/study-debt-widget";

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
          <StudyDebtWidget tasks={semester.tasks} />
          <EditSemesterDialog semester={semester} />
          <Link href={`/semesters/${semester.id}/courses/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Course
            </Button>
          </Link>
        </div>
      </div>

      {/* Client-side interactive content with state management */}
      <SemesterContent semester={semester} metrics={metrics} />
    </div>
  );
}
