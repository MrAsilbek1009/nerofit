import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMealLog,
  listMeals,
  listRecentMealLogs,
  listTodayMealLogs,
  logMeal,
  logManualMeal,
  logScannedMeal,
} from "@/lib/api/meals";
import {
  addFavorite,
  createUserMeal,
  deleteUserMeal,
  listFavorites,
  listUserMeals,
  removeFavorite,
  type FavoriteInput,
  type UserMealItem,
} from "@/lib/api/userFoods";
import { recentFoodsFromLogs } from "@/lib/nutrition/fastLog";
import { dailyIntake } from "@/lib/nutrition/adaptive";
import {
  computeLogStreak,
  trailingKcal,
  weekDots,
  type WeekDot,
} from "@/lib/nutrition/insights";
import {
  listSupplements,
  listTodaySupplementLogs,
  setSupplementTaken,
} from "@/lib/api/supplements";
import {
  analyzeFoodPhoto,
  deleteFoodScan,
  fixFoodEstimate,
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

// Everything derived from meal_logs, refreshed after any log/delete.
function invalidateMealData(
  qc: ReturnType<typeof useQueryClient>,
  userId: string | undefined,
): void {
  if (!userId) return;
  void qc.invalidateQueries({ queryKey: qk.mealLogsToday(userId) });
  void qc.invalidateQueries({ queryKey: ["recent-foods", userId] });
  void qc.invalidateQueries({ queryKey: ["kcal-week", userId] });
  void qc.invalidateQueries({ queryKey: ["nutrition-streak", userId] });
  void qc.invalidateQueries({ queryKey: ["logged-days", userId] });
}

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
      invalidateMealData(qc, userId);
    },
  });
}

// Local YYYY-MM-DD (query layer owns "now" so screens stay pure for the
// React compiler — same convention as adaptiveGoals.ts).
function localToday(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// ---- Insights (daily breakdown + streak) ----

// Trailing 7-day kcal series + average over logged days.
export function useWeeklyKcal(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ["kcal-week", userId] : ["kcal-week", "none"],
    queryFn: async () =>
      trailingKcal(dailyIntake(await listRecentMealLogs(userId!, 7, 400)), localToday()),
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
}

// Distinct YYYY-MM-DD keys with at least one meal log (home week-strip dots).
export function useLoggedMealDays(userId: string | undefined, days = 28) {
  return useQuery({
    queryKey: userId ? ["logged-days", userId, days] : ["logged-days", "none"],
    queryFn: async () => {
      const logs = await listRecentMealLogs(userId!, days, 800);
      return [...new Set(logs.map((l) => l.log_date))];
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
}

export type NutritionStreak = { streak: number; dots: WeekDot[] };

// Consecutive-day logging streak + current-week dots (celebration modal).
export function useNutritionStreak(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ["nutrition-streak", userId] : ["nutrition-streak", "none"],
    queryFn: async (): Promise<NutritionStreak> => {
      const logs = await listRecentMealLogs(userId!, 28, 600);
      const days = logs.map((l) => l.log_date);
      const today = localToday();
      return { streak: computeLogStreak(days, today), dots: weekDots(days, today) };
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
}

// ---- Fast log (recents + favorites + quick add + saved meals) ----

// Recent distinct foods derived from the last two weeks of meal_logs — the
// Cal AI "Suggestions" list. Invalidated alongside mealLogsToday on every log.
export function useRecentFoods(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ["recent-foods", userId] : ["recent-foods", "none"],
    queryFn: async () => recentFoodsFromLogs(await listRecentMealLogs(userId!)),
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
}

// Quick add + logging favorites/recents/saved meals — denormalized entry,
// stored with source="manual".
export function useLogManualMeal(userId: string | undefined) {
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
      return logManualMeal(userId, entry);
    },
    onSuccess: (_data, entry) => {
      track("meal_logged", { source: "manual", slot: entry.slot });
      invalidateMealData(qc, userId);
    },
  });
}

export function useFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ["favorite-foods", userId] : ["favorite-foods", "none"],
    queryFn: () => listFavorites(userId!),
    enabled: !!userId,
  });
}

export function useAddFavorite(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FavoriteInput) => {
      if (!userId) throw new Error("Not authenticated");
      return addFavorite(userId, input);
    },
    onSuccess: () => {
      track("food_favorited");
      if (userId) void qc.invalidateQueries({ queryKey: ["favorite-foods", userId] });
    },
  });
}

export function useRemoveFavorite(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeFavorite(id),
    onSuccess: () => {
      if (userId) void qc.invalidateQueries({ queryKey: ["favorite-foods", userId] });
    },
  });
}

export function useUserMeals(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ["user-meals", userId] : ["user-meals", "none"],
    queryFn: () => listUserMeals(userId!),
    enabled: !!userId,
  });
}

export function useCreateUserMeal(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, items }: { name: string; items: UserMealItem[] }) => {
      if (!userId) throw new Error("Not authenticated");
      return createUserMeal(userId, name, items);
    },
    onSuccess: () => {
      track("user_meal_created");
      if (userId) void qc.invalidateQueries({ queryKey: ["user-meals", userId] });
    },
  });
}

export function useDeleteUserMeal(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUserMeal(id),
    onSuccess: () => {
      if (userId) void qc.invalidateQueries({ queryKey: ["user-meals", userId] });
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

// "Fix with AI": text correction → re-estimate via the same Edge Function.
// Image is optional (photo scans pass it; barcode/search fixes are text-only).
export function useFixFoodEstimate() {
  return useMutation({
    mutationFn: ({
      previous,
      hint,
      image,
    }: {
      previous: FoodScanResult;
      hint: string;
      image?: { base64: string; mediaType: string; photoPath: string | null } | null;
    }) => fixFoodEstimate(previous, hint, image),
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
      invalidateMealData(qc, userId);
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
    onSuccess: () => invalidateMealData(qc, userId),
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
