import { useQuery } from "@tanstack/react-query";
import { listPrograms } from "@/lib/api/programs";
import { qk } from "./keys";

export function usePrograms() {
  return useQuery({
    queryKey: qk.programs(),
    queryFn: listPrograms,
    staleTime: 1000 * 60 * 5, // catalog rarely changes
  });
}
