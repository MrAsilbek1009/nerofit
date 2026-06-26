import { useQuery } from "@tanstack/react-query";
import { useUserId } from "@/hooks/useUser";
import {
  getProgramDayDetail,
  listCompletedDayIds,
  listCurriculumPrograms,
  listProgramDays,
} from "@/lib/api/curriculum";
import { useGoals } from "./goals";
import { qk } from "./keys";

export function useCurriculumPrograms() {
  return useQuery({
    queryKey: qk.curriculumPrograms(),
    queryFn: listCurriculumPrograms,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProgramDays(programId: string | undefined) {
  return useQuery({
    queryKey: programId ? qk.programDays(programId) : ["program-days", "none"],
    queryFn: () => listProgramDays(programId!),
    enabled: !!programId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCompletedDayIds(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? qk.completedDays(userId) : ["completed-days", "none"],
    queryFn: () => listCompletedDayIds(userId!),
    enabled: !!userId,
    staleTime: 0,
  });
}

export function useProgramDayDetail(dayId: string | undefined) {
  const userId = useUserId();
  const goals = useGoals(userId);
  const injuries = goals.data?.injuries ?? [];
  const equipment = goals.data?.equipment;
  return useQuery({
    queryKey: dayId
      ? [...qk.programDayDetail(dayId), injuries.join(","), equipment ?? ""]
      : ["program-day-detail", "none"],
    queryFn: () => getProgramDayDetail(dayId!, injuries, equipment),
    enabled: !!dayId && (!userId || !goals.isLoading),
  });
}
