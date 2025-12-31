"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getCourseData } from "@/actions/get-course-data";

/**
 * Hook to fetch course data with tasks and grade weights
 */
export function useCourseData(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courses.fullData(courseId),
    queryFn: () => getCourseData(courseId),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch tasks for a course
 * Used for task list, board, and calendar views
 */
export function useCourseTasks(courseId: string) {
  const { data: course, ...rest } = useCourseData(courseId);

  return {
    ...rest,
    data: course?.tasks ?? [],
    course,
  };
}
