"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";

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
            // Retry failed mutations once
            retry: 1,

            // Network timeout of 10 seconds
            // This ensures mutations fail properly when offline instead of hanging
            networkMode: "online",

            // Retry delay - exponential backoff
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 3000),
          },
        },
      }),
  );

  // Expose queryClient to DevTools
  useEffect(() => {
    window.__TANSTACK_QUERY_CLIENT__ = queryClient;
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
