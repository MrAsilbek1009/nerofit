import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

// Cached queries are kept for a day so they can be both persisted to disk and
// read back when the device is offline (gcTime must be >= the persist maxAge).
export const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h

// One QueryClient per app instance. Server state is owned here; component
// fetching via useEffect is forbidden (see CLAUDE.md rule #3).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30,
      gcTime: CACHE_MAX_AGE_MS,
      refetchOnWindowFocus: false,
      // Refetch once connectivity returns (effective once onlineManager is
      // wired to NetInfo; harmless until then).
      refetchOnReconnect: true,
    },
  },
});

// Persist the query cache to AsyncStorage so the app shows last-known data
// instantly on cold start and keeps working when offline.
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});
