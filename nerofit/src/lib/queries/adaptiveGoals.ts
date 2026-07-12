import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGoals } from "@/lib/api/goals";
import { listRecentMealLogs } from "@/lib/api/meals";
import {
  getLatestNutritionTarget,
  upsertNutritionTarget,
  type NutritionTarget,
} from "@/lib/api/nutritionTargets";
import { getProfile, updateProfile } from "@/lib/api/profiles";
import { listWeightSeries } from "@/lib/api/progress";
import {
  computeAdaptiveTargets,
  isRecomputeDue,
  type GoalFocus,
} from "@/lib/nutrition/adaptive";
import { track } from "@/lib/analytics";
import { qk } from "./keys";

export type AdaptiveStatus = {
  /** Latest stored target (null until the first successful recompute). */
  target: NutritionTarget | null;
  /** True when THIS check produced a new target. */
  justUpdated: boolean;
  /** True while the target is fresh (≤3 days) — drives the "plan updated" card. */
  showNotice: boolean;
  /** Set when a recompute was due but the data gates failed. */
  insufficient: { completeDays: number; weighIns: number } | null;
};

function todayKey(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Computed here (not in render) so screens stay pure for the React compiler.
function isFresh(target: NutritionTarget | null, days = 3): boolean {
  if (!target) return false;
  return Date.now() - Date.parse(`${target.effective_date}T00:00:00`) < days * 24 * 60 * 60 * 1000;
}

const FOCUSES: GoalFocus[] = ["lose_fat", "build_muscle", "stay_fit"];

/**
 * Weekly adaptive-goals check (MacroFactor-style, docs/nutrition-pillar-plan.md
 * N3). There is no server-side scheduler, so the check runs when the Nutrition
 * tab mounts: if the stored target is a week old, recompute from the last
 * weeks of intake + weight data and — when the data gates pass — persist a new
 * target and write the macro goals to the profile (the live source every
 * screen already reads). The queryFn persists as a side effect on purpose:
 * it is idempotent per (user, day) via the nutrition_targets unique key, and
 * gating it behind a mutation would need effect-driven fetching instead.
 */
export function useAdaptiveGoals(userId: string | undefined) {
  const qc = useQueryClient();
  return useQuery<AdaptiveStatus>({
    queryKey: userId ? ["adaptive-goals", userId] : ["adaptive-goals", "none"],
    queryFn: async (): Promise<AdaptiveStatus> => {
      const today = todayKey();
      const latest = await getLatestNutritionTarget(userId!);
      if (!isRecomputeDue(latest?.effective_date ?? null, today)) {
        return {
          target: latest,
          justUpdated: false,
          showNotice: isFresh(latest),
          insufficient: null,
        };
      }

      const since = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString();
      const [weights, logs, profile, goals] = await Promise.all([
        listWeightSeries(userId!, since),
        listRecentMealLogs(userId!, 28, 600),
        getProfile(userId!),
        getGoals(userId!),
      ]);

      const focus = FOCUSES.includes(goals?.focus as GoalFocus)
        ? (goals?.focus as GoalFocus)
        : null;

      const result = computeAdaptiveTargets(
        {
          weights: weights.map((w) => ({
            recorded_at: w.recorded_at,
            weight_kg: Number(w.weight_kg),
          })),
          logs,
          current: {
            protein_g: profile.protein_goal_g,
            carbs_g: profile.carbs_goal_g,
            fats_g: profile.fats_goal_g,
          },
          focus,
          lastTargetKcal: latest?.kcal ?? null,
        },
        today,
      );

      if (result.status === "insufficient_data") {
        return {
          target: latest,
          justUpdated: false,
          showNotice: false,
          insufficient: {
            completeDays: result.completeDays,
            weighIns: result.weighIns,
          },
        };
      }

      await upsertNutritionTarget(userId!, {
        effective_date: today,
        kcal: result.kcal,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fats_g: result.fats_g,
        tdee_kcal: result.tdee_kcal,
        weight_trend_weekly_kg: result.weight_trend_weekly_kg,
      });
      await updateProfile(userId!, {
        protein_goal_g: result.protein_g,
        carbs_goal_g: result.carbs_g,
        fats_goal_g: result.fats_g,
      });
      track("adaptive_goals_updated", { kcal: result.kcal, tdee: result.tdee_kcal });
      void qc.invalidateQueries({ queryKey: qk.profile(userId!) });

      const fresh = await getLatestNutritionTarget(userId!);
      return { target: fresh, justUpdated: true, showNotice: true, insufficient: null };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60, // re-check at most hourly; real cadence is weekly
    retry: 1,
  });
}
