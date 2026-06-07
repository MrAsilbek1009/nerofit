import { QueryClient } from "@tanstack/react-query";

// One QueryClient per app instance. Server state is owned here; component
// fetching via useEffect is forbidden (see CLAUDE.md rule #3).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
});
