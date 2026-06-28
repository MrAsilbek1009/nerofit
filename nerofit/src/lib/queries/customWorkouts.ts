import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLibraryExercises } from "@/lib/api/exercises";
import {
  completeCustomSession,
  createCustomSession,
  getCustomSession,
  listCompletedCustomSessions,
  logCustomExercise,
  type LogCustomExerciseInput,
  type NewCustomExercise,
} from "@/lib/api/customWorkouts";
import type { GeneratorParams } from "@/types/db";
import { qk } from "./keys";

export function useLibraryExercises() {
  return useQuery({
    queryKey: qk.libraryExercises(),
    queryFn: listLibraryExercises,
    staleTime: 1000 * 60 * 30,
  });
}

export function useCustomSession(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.customSession(id) : ["custom-session", "none"],
    queryFn: () => getCustomSession(id!),
    enabled: !!id,
  });
}

export function useCreateCustomSession(userId: string | undefined) {
  return useMutation({
    mutationFn: (input: {
      title: string;
      params: GeneratorParams;
      exercises: NewCustomExercise[];
    }) => createCustomSession(userId!, input),
  });
}

export function useLogCustomExercise(sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogCustomExerciseInput) => logCustomExercise(input),
    onSuccess: () => {
      if (sessionId) void qc.invalidateQueries({ queryKey: qk.customSession(sessionId) });
    },
  });
}

export function useCompleteCustomSession(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeCustomSession(id),
    onSuccess: () => {
      if (userId) void qc.invalidateQueries({ queryKey: qk.customSessions(userId) });
    },
  });
}

export function useCompletedCustomSessions(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? qk.customSessions(userId) : ["custom-sessions", "none"],
    queryFn: () => listCompletedCustomSessions(userId!),
    enabled: !!userId,
  });
}
