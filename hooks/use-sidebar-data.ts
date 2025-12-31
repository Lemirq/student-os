"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getSidebarData } from "@/actions/sidebar";

export function useSidebarData() {
  return useQuery({
    queryKey: queryKeys.sidebar.all,
    queryFn: () => getSidebarData(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });
}
