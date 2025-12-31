"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getAIContext } from "@/actions/ai-context";

export function useAIContext() {
  return useQuery({
    queryKey: queryKeys.ai.context("user"), // TODO: use actual userId if needed
    queryFn: () => getAIContext(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
}
