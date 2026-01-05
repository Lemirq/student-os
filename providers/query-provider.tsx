"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";
import { setupQueryPersistence } from "@/lib/query-persist";

// TypeScript declaration for DevTools
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: QueryClient;
  }
}

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time of 30s - data is fresh for quick successive edits
            // Prevents immediate refetch after SSR hydration
            staleTime: 30 * 1000,

            // Cache time of 5 minutes - keep unused data in memory
            gcTime: 5 * 60 * 1000,

            // Refetch on window focus to sync changes from other tabs/windows
            refetchOnWindowFocus: true,

            // Don't refetch on mount if data is still fresh
            refetchOnMount: false,

            // Retry failed requests 1 time
            retry: 1,

            // Refetch in background every 60s to keep data fresh
            refetchInterval: false, // We'll enable this per-query where needed
          },
          mutations: {
            // Retry failed mutations 3 times for offline support
            retry: 3,

            // Allow mutations when offline - will be queued
            networkMode: "offlineFirst",

            // Retry delay - exponential backoff (1s, 2s, 4s)
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 4000),
          },
        },
      }),
  );

  // Expose queryClient to DevTools & Setup persistence
  useEffect(() => {
    window.__TANSTACK_QUERY_CLIENT__ = queryClient;

    // Enable offline persistence for Linear-like offline-first experience
    setupQueryPersistence(queryClient);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
