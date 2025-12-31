"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getSemesterData } from "@/actions/semesters";
import { getDashboardMetrics } from "@/actions/dashboard";

/**
 * Hook to fetch semester data with tasks and courses
 */
export function useSemesterData(semesterId: string) {
  return useQuery({
    queryKey: queryKeys.semesters.detail(semesterId),
    queryFn: () => getSemesterData(semesterId),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch dashboard metrics for a semester
 */
export function useDashboardMetrics(semesterId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics(semesterId),
    queryFn: () => getDashboardMetrics(semesterId),
    staleTime: 2 * 60 * 1000, // 2 minutes - expensive calculation
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch tasks for a semester
 * Used for task list, board, and calendar views
 */
export function useSemesterTasks(semesterId: string) {
  const { data: semester, ...rest } = useSemesterData(semesterId);

  return {
    ...rest,
    data: semester?.tasks ?? [],
    semester,
  };
}
