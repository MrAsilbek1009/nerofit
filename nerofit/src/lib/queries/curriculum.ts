import { useQuery } from "@tanstack/react-query";
import {
  getProgramDayDetail,
  listCurriculumPrograms,
  listProgramDays,
} from "@/lib/api/curriculum";
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

export function useProgramDayDetail(dayId: string | undefined) {
  return useQuery({
    queryKey: dayId ? qk.programDayDetail(dayId) : ["program-day-detail", "none"],
    queryFn: () => getProgramDayDetail(dayId!),
    enabled: !!dayId,
  });
}
