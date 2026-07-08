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
import {
  analyzeFoodPhoto,
  deleteFoodScan,
  listFoodScans,
  recordFoodScan,
  type FoodScanResult,
} from "@/lib/api/foodScan";
import { signScanPhotos } from "@/lib/api/foodPhotos";
import { lookupBarcode, searchFoods } from "@/lib/api/openFoodFacts";
import { lookupLocalBarcode, searchLocalFoods, submitFood } from "@/lib/api/foods";
import { mergeFoodHits } from "@/lib/nutrition/foodMerge";
import type { FoodInput } from "@/lib/nutrition/foodInput";
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
      photoPath,
    }: {
      imageBase64: string;
      mediaType: string;
      photoPath?: string | null;
    }) => analyzeFoodPhoto(imageBase64, mediaType, photoPath),
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

// ---- Barcode + ingredient search (local foods DB, then OpenFoodFacts) ----
// Local DB is checked first (regional foods + local barcodes); OFF is the
// fallback. Returns null when unknown everywhere (caller shows "not found").
export function useBarcodeLookup() {
  return useMutation({
    mutationFn: async (code: string) => {
      const local = await lookupLocalBarcode(code).catch(() => null);
      return local ?? (await lookupBarcode(code));
    },
  });
}

// Debounce the `query` string in the caller; this keys the cache on it.
// Merges local DB hits (verified-first) ahead of OpenFoodFacts. Local is optional
// (the foods table may not exist until the migration is applied) — OFF errors
// still surface so the search error state works.
export function useFoodSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["food-search", q],
    queryFn: async () => {
      const [local, off] = await Promise.all([
        searchLocalFoods(q).catch(() => []),
        searchFoods(q),
      ]);
      return mergeFoodHits(local, off);
    },
    enabled: q.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

// Crowdsource: submit a community food (usable immediately, public once moderated).
export function useSubmitFood(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FoodInput) => {
      if (!userId) throw new Error("Not authenticated");
      return submitFood(userId, input);
    },
    onSuccess: () => {
      track("food_submitted");
      void qc.invalidateQueries({ queryKey: ["food-search"] });
    },
  });
}

// ---- Scan history ----
export function useFoodScans(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ["food-scans", userId] : ["food-scans", "none"],
    // Sign photo URLs in the query layer so the api stays single-purpose.
    queryFn: async () => signScanPhotos(await listFoodScans(userId!)),
    enabled: !!userId,
  });
}

export function useDeleteFoodScan(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFoodScan(id),
    onSuccess: () => {
      if (userId) void qc.invalidateQueries({ queryKey: ["food-scans", userId] });
    },
  });
}

// Save a barcode/search estimate to history (best-effort — never blocks the
// scan flow if it fails).
export function useRecordFoodScan(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (result: FoodScanResult) => {
      if (!userId) throw new Error("Not authenticated");
      return recordFoodScan(userId, result);
    },
    onSuccess: () => {
      if (userId) void qc.invalidateQueries({ queryKey: ["food-scans", userId] });
    },
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
