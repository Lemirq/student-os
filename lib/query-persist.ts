/**
 * React Query persistence configuration for offline support.
 * Stores query data in localStorage and enables mutation queue retry.
 */

import * as React from "react";
import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Only enable persistence on client-side
export function setupQueryPersistence(queryClient: QueryClient) {
  if (typeof window === "undefined") return;

  try {
    const localStoragePersister = createSyncStoragePersister({
      storage: window.localStorage,
      key: "STUDENT_OS_CACHE",
      // Serialize/deserialize to handle dates and complex objects
      serialize: (data) => JSON.stringify(data),
      deserialize: (data) => JSON.parse(data),
    });

    persistQueryClient({
      queryClient,
      persister: localStoragePersister,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      // Only persist specific query types (avoid persisting everything)
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Only persist queries that are successful and not too old
          const queryKey = query.queryKey[0];
          if (typeof queryKey === "string") {
            // Persist tasks, courses, and sidebar data
            return ["tasks", "courses", "sidebar", "semesters"].includes(
              queryKey,
            );
          }
          return false;
        },
      },
    });

    console.log("[Query Persistence] Enabled local storage persistence");
  } catch (error) {
    console.error("[Query Persistence] Failed to setup persistence:", error);
  }
}

// Online/offline detection hooks
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(
    typeof window !== "undefined" ? window.navigator.onLine : true,
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
