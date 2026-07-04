import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMealLog,
  listMeals,
  listTodayMealLogs,
  logMeal,
  logScannedMeal,
} from "@/lib/api/meals";
import {
  listSupplements,
  listTodaySupplementLogs,
  setSupplementTaken,
} from "@/lib/api/supplements";
import { analyzeFoodPhoto } from "@/lib/api/foodScan";
import { lookupBarcode, searchFoods } from "@/lib/api/openFoodFacts";
import { track } from "@/lib/analytics";
import { qk } from "./keys";
import type { Meal, MealSlot } from "@/types/db";

// ---- Meals ----
export function useMeals() {
  return useQuery({
    queryKey: qk.meals(),
    queryFn: listMeals,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTodayMealLogs(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? qk.mealLogsToday(userId) : ["meal-logs-today", "none"],
    queryFn: () => listTodayMealLogs(userId!),
    enabled: !!userId,
  });
}

export function useLogMeal(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meal, slot }: { meal: Meal; slot: MealSlot }) => {
      if (!userId) throw new Error("Not authenticated");
      return logMeal(userId, meal, slot);
    },
    onSuccess: (_data, { meal, slot }) => {
      track("meal_logged", { meal_id: meal.id, slot });
      if (userId)
        void qc.invalidateQueries({ queryKey: qk.mealLogsToday(userId) });
    },
  });
}

// ---- Food scan ----
export function useAnalyzeFoodPhoto() {
  return useMutation({
    mutationFn: ({
      imageBase64,
      mediaType,
    }: {
      imageBase64: string;
      mediaType: string;
    }) => analyzeFoodPhoto(imageBase64, mediaType),
  });
}

export function useLogScannedMeal(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry: {
      name: string;
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fats_g: number;
      slot: MealSlot;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      return logScannedMeal(userId, entry);
    },
    onSuccess: (_data, entry) => {
      track("meal_logged", { source: "scan", slot: entry.slot });
      if (userId)
        void qc.invalidateQueries({ queryKey: qk.mealLogsToday(userId) });
    },
  });
}

// ---- Barcode + ingredient search (OpenFoodFacts) ----
// Returns null when the code is unknown / unusable (caller shows "not found").
export function useBarcodeLookup() {
  return useMutation({
    mutationFn: (code: string) => lookupBarcode(code),
  });
}

// Debounce the `query` string in the caller; this keys the cache on it.
export function useFoodSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["food-search", q],
    queryFn: () => searchFoods(q),
    enabled: q.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDeleteMealLog(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMealLog(id),
    onSuccess: () => {
      if (userId)
        void qc.invalidateQueries({ queryKey: qk.mealLogsToday(userId) });
    },
  });
}

// ---- Supplements ----
export function useSupplements() {
  return useQuery({
    queryKey: qk.supplements(),
    queryFn: listSupplements,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTodaySupplementLogs(userId: string | undefined) {
  return useQuery({
    queryKey: userId
      ? qk.supplementLogsToday(userId)
      : ["supplement-logs-today", "none"],
    queryFn: () => listTodaySupplementLogs(userId!),
    enabled: !!userId,
  });
}

export function useToggleSupplement(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplementId,
      taken,
    }: {
      supplementId: string;
      taken: boolean;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      return setSupplementTaken(userId, supplementId, taken);
    },
    onSuccess: (_data, { supplementId, taken }) => {
      track("supplement_toggled", { supplement_id: supplementId, taken });
      if (userId)
        void qc.invalidateQueries({ queryKey: qk.supplementLogsToday(userId) });
    },
  });
}
