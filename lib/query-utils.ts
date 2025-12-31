import {
  QueryClient,
  dehydrate,
  type QueryFunction,
  type QueryKey,
} from "@tanstack/react-query";

/**
 * Create a QueryClient for server-side use
 * Should be created per request to avoid sharing state between users
 */
export function createServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries on the server
        retry: false,
        // Data fetched on server should be considered fresh
        staleTime: 60 * 1000,
      },
    },
  });
}

/**
 * Prefetch a query on the server and return dehydrated state
 * Usage in server components:
 *
 * const queryClient = createServerQueryClient();
 * await prefetchQuery(queryClient, queryKeys.tasks.bySemester(id), () => getTasks(id));
 * const dehydratedState = dehydrateQueryClient(queryClient);
 *
 * return <HydrationBoundary state={dehydratedState}>...</HydrationBoundary>
 */
export async function prefetchQuery<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  queryFn: QueryFunction<T>,
) {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
  });
}

/**
 * Dehydrate the query client state for client-side hydration
 */
export function dehydrateQueryClient(queryClient: QueryClient) {
  return dehydrate(queryClient);
}

/**
 * Helper to prefetch multiple queries in parallel
 */
export async function prefetchQueries(
  queryClient: QueryClient,
  queries: Array<{
    queryKey: QueryKey;
    queryFn: QueryFunction<unknown>;
  }>,
) {
  await Promise.all(
    queries.map(({ queryKey, queryFn }) =>
      queryClient.prefetchQuery({ queryKey, queryFn }),
    ),
  );
}
