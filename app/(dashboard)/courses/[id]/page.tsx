import { getCourseData } from "@/actions/get-course-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { notFound } from "next/navigation";
import { CourseStrategySidebar } from "@/components/dashboard/course-strategy-sidebar";
import { TaskExplorer } from "@/components/tasks/task-explorer";
import { QuickAddCourseTask } from "@/components/dashboard/quick-add-course-task";
import { EditCourseDialog } from "@/components/courses/edit-course-dialog";
import { HydrationBoundary } from "@tanstack/react-query";
import {
  createServerQueryClient,
  dehydrateQueryClient,
  prefetchQuery,
} from "@/lib/query-utils";
import { queryKeys } from "@/lib/query-keys";
import { CoursePageContent } from "@/components/courses/course-page-content";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { id } = await params;

  // Create a query client for this request
  const queryClient = createServerQueryClient();

  // Prefetch course data on the server
  await prefetchQuery(queryClient, queryKeys.courses.fullData(id), () =>
    getCourseData(id),
  );

  // Get course data for initial check
  const course = await getCourseData(id);

  if (!course) {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrateQueryClient(queryClient)}>
      <CoursePageContent courseId={id} />
    </HydrationBoundary>
  );
}
