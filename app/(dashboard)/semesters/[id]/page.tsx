import { getSemesterData } from "@/actions/semesters";
import { getDashboardMetrics } from "@/actions/dashboard";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { EditSemesterDialog } from "@/components/semesters/edit-semester-dialog";
import { SemesterContent } from "@/components/semesters/semester-content";
import { CreateCourseDialog } from "@/components/courses/create-course-dialog";
import { StudyDebtWidget } from "@/components/insights/study-debt-widget";
import { HydrationBoundary } from "@tanstack/react-query";
import {
  createServerQueryClient,
  dehydrateQueryClient,
  prefetchQueries,
} from "@/lib/query-utils";
import { queryKeys } from "@/lib/query-keys";

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

  // Create a query client for this request
  const queryClient = createServerQueryClient();

  // Prefetch data in parallel on the server
  await prefetchQueries(queryClient, [
    {
      queryKey: queryKeys.semesters.detail(id),
      queryFn: () => getSemesterData(id),
    },
    {
      queryKey: queryKeys.dashboard.metrics(id),
      queryFn: () => getDashboardMetrics(id),
    },
  ]);

  // Get semester data for the header (still need it for the server component)
  const semester = await getSemesterData(id);

  if (!semester) {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrateQueryClient(queryClient)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {semester.name}
            </h1>
            <p className="text-muted-foreground">
              {formatDateOnly(semester.startDate)} -{" "}
              {formatDateOnly(semester.endDate)}
            </p>
          </div>
          <div className="fr gap-2 items-start">
            <StudyDebtWidget tasks={semester.tasks} />
            <EditSemesterDialog semester={semester} />
            <CreateCourseDialog semesterId={semester.id}>
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" /> Add Course
              </Button>
            </CreateCourseDialog>
          </div>
        </div>

        {/* Client-side interactive content with state management */}
        <SemesterContent semesterId={id} />
      </div>
    </HydrationBoundary>
  );
}
