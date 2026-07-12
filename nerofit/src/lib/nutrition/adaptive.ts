// Adaptive TDEE + goal recompute (MacroFactor-inspired, conservative).
// Weekly: average logged intake vs the smoothed weight trend → estimated
// expenditure → new kcal/macro targets nudged toward the user's focus.
// Adherence-neutral by design: small clamped steps, no punishment for gaps —
// with too little data we simply don't update.
//
// Pure module: no runtime imports (only type imports), deterministic — the
// caller passes `today`, nothing here reads the clock.

export type WeightPointIn = {
  recorded_at: string; // ISO timestamp
  weight_kg: number;
};

export type IntakeLogIn = {
  log_date: string; // YYYY-MM-DD
  kcal: number | null;
};

export type GoalFocus = "lose_fat" | "build_muscle" | "stay_fit";

export type AdaptiveInputs = {
  /** Weight entries, any order; ~last 6 weeks. */
  weights: readonly WeightPointIn[];
  /** Meal logs (only log_date + kcal used); ~last 4 weeks. */
  logs: readonly IntakeLogIn[];
  /** Current live goals from the profile (grams). */
  current: { protein_g: number; carbs_g: number; fats_g: number };
  /** Onboarding focus; null falls back to stay_fit (maintenance). */
  focus: GoalFocus | null;
  /** kcal of the previous adaptive target, if any (clamps the step size). */
  lastTargetKcal: number | null;
};

export type AdaptiveResult =
  | {
      status: "insufficient_data";
      completeDays: number;
      weighIns: number;
    }
  | {
      status: "updated";
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fats_g: number;
      tdee_kcal: number;
      weight_trend_weekly_kg: number;
    };

// ---- Tunables (kept in one place; see docs/nutrition-pillar-plan.md N3) ----

// A logged day below this is treated as incomplete and excluded from the
// intake average — half-logged days would drag the TDEE estimate down and
// starve the target (the opposite of adherence-neutral).
const MIN_COMPLETE_DAY_KCAL = 1000;
// Data gates before we touch anyone's goals.
const MIN_COMPLETE_DAYS_14 = 8; // complete intake days in the last 14
const MIN_WEIGH_INS_21 = 4; // weigh-ins in the last 21 days…
const MIN_WEIGH_SPAN_DAYS = 10; // …spanning at least this many days
// EWMA smoothing for the weight trend (per weigh-in day).
const TREND_ALPHA = 0.3;
// kcal per kg of body weight change.
const KCAL_PER_KG = 7700;
// Weekly rate by focus, as a fraction of trend body weight.
const WEEKLY_RATE: Record<GoalFocus, number> = {
  lose_fat: -0.005, // −0.5% BW/week
  build_muscle: 0.0025, // +0.25% BW/week
  stay_fit: 0,
};
// Gentle step: a single recompute moves the target at most this many kcal.
const MAX_STEP_KCAL = 150;
// Sanity bands.
const TDEE_MIN = 1200;
const TDEE_MAX = 4500;
const TARGET_MIN = 1200;
const TARGET_MAX = 4500;
// Macro split: protein by trend weight, fats as a kcal share, carbs remainder.
const PROTEIN_G_PER_KG = 1.8;
const FAT_KCAL_SHARE = 0.25;
const MIN_FAT_G = 40;

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round(
    (Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS,
  );
}

/** Sum logs into per-day kcal totals (YYYY-MM-DD keys, ascending). */
export function dailyIntake(logs: readonly IntakeLogIn[]): { date: string; kcal: number }[] {
  const byDay = new Map<string, number>();
  for (const log of logs) {
    if (!log.log_date) continue;
    byDay.set(log.log_date, (byDay.get(log.log_date) ?? 0) + (log.kcal ?? 0));
  }
  return [...byDay.entries()]
    .map(([date, kcal]) => ({ date, kcal }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// One weight per day (the last entry wins), ascending by day.
function dailyWeights(weights: readonly WeightPointIn[]): { day: string; kg: number }[] {
  const sorted = [...weights]
    .filter((w) => Number.isFinite(w.weight_kg) && w.weight_kg > 0)
    .sort((a, b) => (a.recorded_at < b.recorded_at ? -1 : 1));
  const byDay = new Map<string, number>();
  for (const w of sorted) byDay.set(dayKey(w.recorded_at), w.weight_kg);
  return [...byDay.entries()].map(([day, kg]) => ({ day, kg }));
}

/**
 * EWMA weight trend over per-day weigh-ins. Returns the smoothed weight now
 * and ~7 days earlier (interpolated on the smoothed series), or null when the
 * series is too sparse to say anything.
 */
export function weightTrend(
  weights: readonly WeightPointIn[],
): { trend_kg: number; weekly_delta_kg: number } | null {
  const days = dailyWeights(weights);
  if (days.length < 2) return null;

  let ewma = days[0]!.kg;
  const smoothed: { day: string; kg: number }[] = [{ day: days[0]!.day, kg: ewma }];
  for (let i = 1; i < days.length; i++) {
    ewma = ewma + TREND_ALPHA * (days[i]!.kg - ewma);
    smoothed.push({ day: days[i]!.day, kg: ewma });
  }

  const last = smoothed[smoothed.length - 1]!;
  // Walk back to the smoothed point closest to 7 days before the last one.
  let ref = smoothed[0]!;
  for (const p of smoothed) {
    if (daysBetween(p.day, last.day) >= 7) ref = p;
  }
  const span = daysBetween(ref.day, last.day);
  if (span <= 0) return null;
  const weekly = ((last.kg - ref.kg) / span) * 7;
  return {
    trend_kg: Math.round(last.kg * 100) / 100,
    weekly_delta_kg: Math.round(weekly * 100) / 100,
  };
}

function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * The weekly check. `today` is a YYYY-MM-DD local date key. Returns either an
 * updated target or an insufficient-data marker (in which case existing goals
 * are left untouched).
 */
export function computeAdaptiveTargets(
  inputs: AdaptiveInputs,
  today: string,
): AdaptiveResult {
  // Gate 1: enough complete intake days in the last 14.
  const intake = dailyIntake(inputs.logs).filter(
    (d) => daysBetween(d.date, today) < 14 && daysBetween(d.date, today) >= 0,
  );
  const complete = intake.filter((d) => d.kcal >= MIN_COMPLETE_DAY_KCAL);

  // Gate 2: enough weigh-ins over a wide-enough span in the last 21 days.
  const recentWeights = inputs.weights.filter(
    (w) =>
      daysBetween(dayKey(w.recorded_at), today) < 21 &&
      daysBetween(dayKey(w.recorded_at), today) >= 0,
  );
  const weighDays = dailyWeights(recentWeights);
  const span =
    weighDays.length >= 2
      ? daysBetween(weighDays[0]!.day, weighDays[weighDays.length - 1]!.day)
      : 0;

  const trend = weightTrend(inputs.weights);

  if (
    complete.length < MIN_COMPLETE_DAYS_14 ||
    weighDays.length < MIN_WEIGH_INS_21 ||
    span < MIN_WEIGH_SPAN_DAYS ||
    !trend
  ) {
    return {
      status: "insufficient_data",
      completeDays: complete.length,
      weighIns: weighDays.length,
    };
  }

  // Expenditure: what they ate, corrected by what the scale did.
  const avgIntake = complete.reduce((a, d) => a + d.kcal, 0) / complete.length;
  const tdee = clamp(
    Math.round(avgIntake - (trend.weekly_delta_kg * KCAL_PER_KG) / 7),
    TDEE_MIN,
    TDEE_MAX,
  );

  // Target: TDEE shifted toward the focus, moving gently from the last target.
  const focus: GoalFocus = inputs.focus ?? "stay_fit";
  const rawTarget = tdee + (WEEKLY_RATE[focus] * trend.trend_kg * KCAL_PER_KG) / 7;
  const previous =
    inputs.lastTargetKcal ??
    inputs.current.protein_g * 4 + inputs.current.carbs_g * 4 + inputs.current.fats_g * 9;
  const stepped = clamp(rawTarget, previous - MAX_STEP_KCAL, previous + MAX_STEP_KCAL);
  const kcal = Math.round(clamp(stepped, TARGET_MIN, TARGET_MAX));

  // Macros: protein anchored to body weight, fats as a share, carbs fill.
  const protein_g = round5(clamp(PROTEIN_G_PER_KG * trend.trend_kg, 80, 260));
  const fats_g = Math.max(MIN_FAT_G, Math.round((kcal * FAT_KCAL_SHARE) / 9));
  const carbs_g = Math.max(0, Math.round((kcal - protein_g * 4 - fats_g * 9) / 4));

  return {
    status: "updated",
    kcal,
    protein_g,
    carbs_g,
    fats_g,
    tdee_kcal: tdee,
    weight_trend_weekly_kg: trend.weekly_delta_kg,
  };
}

/** True when the stored target is a week old (or absent) and a recompute is due. */
export function isRecomputeDue(
  lastEffectiveDate: string | null,
  today: string,
): boolean {
  if (!lastEffectiveDate) return true;
  return daysBetween(lastEffectiveDate, today) >= 7;
}
