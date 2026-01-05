"use client";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getTask } from "@/actions/tasks";
import { getCourseData } from "@/actions/get-course-data";

/**
 * Hook for predictive preloading of task and course data on hover.
 * Matches Linear's approach of preloading data before navigation.
 */
export function usePrefetchLinks() {
  const queryClient = useQueryClient();

  const prefetchTask = (taskId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks.detail(taskId),
      queryFn: () => getTask(taskId),
      staleTime: 30000, // Consider fresh for 30s
    });
  };

  const prefetchCourse = (courseId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.courses.fullData(courseId),
      queryFn: () => getCourseData(courseId),
      staleTime: 30000, // Consider fresh for 30s
    });
  };

  return {
    prefetchTask,
    prefetchCourse,
  };
}
