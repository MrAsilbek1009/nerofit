import { describe, expect, it } from "@jest/globals";
import {
  computeAdaptiveTargets,
  dailyIntake,
  isRecomputeDue,
  weightTrend,
  type AdaptiveInputs,
  type IntakeLogIn,
  type WeightPointIn,
} from "./adaptive";

const TODAY = "2026-07-21";

// N days of complete logs ending yesterday: two logs per day summing `kcal`.
function intakeDays(n: number, kcal: number, endOffset = 1): IntakeLogIn[] {
  const logs: IntakeLogIn[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.parse(`${TODAY}T00:00:00Z`) - (i + endOffset) * 86400000)
      .toISOString()
      .slice(0, 10);
    logs.push({ log_date: d, kcal: Math.round(kcal * 0.6) });
    logs.push({ log_date: d, kcal: Math.round(kcal * 0.4) });
  }
  return logs;
}

// Daily weigh-ins moving `weeklyRate` kg/week, ending at `endKg` yesterday
// (negative rate = losing: the series starts higher and declines).
function weighIns(days: number, endKg: number, weeklyRate: number): WeightPointIn[] {
  const points: WeightPointIn[] = [];
  for (let i = 0; i < days; i++) {
    const daysAgo = days - i;
    const day = new Date(Date.parse(`${TODAY}T00:00:00Z`) - daysAgo * 86400000)
      .toISOString()
      .slice(0, 10);
    points.push({
      recorded_at: `${day}T08:00:00Z`,
      weight_kg: endKg - (weeklyRate * daysAgo) / 7,
    });
  }
  return points;
}

const CURRENT = { protein_g: 200, carbs_g: 300, fats_g: 80 }; // DB defaults = 2720 kcal

function baseInputs(overrides: Partial<AdaptiveInputs> = {}): AdaptiveInputs {
  return {
    weights: weighIns(21, 80, -0.5),
    logs: intakeDays(14, 2000),
    current: CURRENT,
    focus: "lose_fat",
    lastTargetKcal: null,
    ...overrides,
  };
}

describe("dailyIntake", () => {
  it("groups and sums logs per day, ascending", () => {
    const days = dailyIntake([
      { log_date: "2026-07-02", kcal: 500 },
      { log_date: "2026-07-01", kcal: 300 },
      { log_date: "2026-07-02", kcal: 700 },
      { log_date: "2026-07-01", kcal: null },
    ]);
    expect(days).toEqual([
      { date: "2026-07-01", kcal: 300 },
      { date: "2026-07-02", kcal: 1200 },
    ]);
  });
});

describe("weightTrend", () => {
  it("returns null with fewer than two weigh-in days", () => {
    expect(weightTrend([])).toBeNull();
    expect(weightTrend([{ recorded_at: "2026-07-01T08:00:00Z", weight_kg: 80 }])).toBeNull();
    // Two entries the same day collapse to one → still null.
    expect(
      weightTrend([
        { recorded_at: "2026-07-01T08:00:00Z", weight_kg: 80 },
        { recorded_at: "2026-07-01T20:00:00Z", weight_kg: 79.5 },
      ]),
    ).toBeNull();
  });

  it("tracks a steady decline with a dampened weekly delta", () => {
    const trend = weightTrend(weighIns(21, 80, -0.5))!;
    expect(trend.weekly_delta_kg).toBeLessThan(-0.2);
    expect(trend.weekly_delta_kg).toBeGreaterThan(-0.6);
    // EWMA lags a falling series: trend sits above the final raw weight (~80).
    expect(trend.trend_kg).toBeGreaterThan(80);
    expect(trend.trend_kg).toBeLessThan(81);
  });

  it("smooths single-day spikes instead of chasing them", () => {
    const steady = weighIns(14, 80, 0);
    const spiked = [...steady];
    spiked[spiked.length - 1] = { ...spiked[spiked.length - 1]!, weight_kg: 82 };
    const trend = weightTrend(spiked)!;
    // One +2kg outlier moves the smoothed weight by at most alpha × 2.
    expect(trend.trend_kg).toBeLessThan(80.7);
  });
});

describe("computeAdaptiveTargets", () => {
  it("refuses to update on too few complete intake days", () => {
    const r = computeAdaptiveTargets(baseInputs({ logs: intakeDays(5, 2000) }), TODAY);
    expect(r.status).toBe("insufficient_data");
    if (r.status === "insufficient_data") expect(r.completeDays).toBe(5);
  });

  it("treats low-kcal days as incomplete, not as adherence data", () => {
    // 14 days logged but only 600 kcal each — all excluded.
    const r = computeAdaptiveTargets(baseInputs({ logs: intakeDays(14, 600) }), TODAY);
    expect(r.status).toBe("insufficient_data");
    if (r.status === "insufficient_data") expect(r.completeDays).toBe(0);
  });

  it("refuses to update on too few weigh-ins", () => {
    const r = computeAdaptiveTargets(
      baseInputs({ weights: weighIns(21, 80, -0.5).slice(-3) }),
      TODAY,
    );
    expect(r.status).toBe("insufficient_data");
  });

  it("estimates TDEE from intake corrected by the weight trend", () => {
    const r = computeAdaptiveTargets(baseInputs({ lastTargetKcal: 2400 }), TODAY);
    expect(r.status).toBe("updated");
    if (r.status !== "updated") return;
    // Eating 2000 while losing ~0.35-0.5 kg/wk → expenditure ≈ 2350-2550.
    expect(r.tdee_kcal).toBeGreaterThan(2300);
    expect(r.tdee_kcal).toBeLessThan(2600);
    expect(r.weight_trend_weekly_kg).toBeLessThan(0);
  });

  it("moves at most MAX_STEP_KCAL from the previous target", () => {
    const r = computeAdaptiveTargets(baseInputs({ lastTargetKcal: null }), TODAY);
    expect(r.status).toBe("updated");
    if (r.status !== "updated") return;
    // No stored target → previous = derived from current goals (2720 kcal);
    // a lose_fat target wants far less, but a single step is gentle.
    expect(r.kcal).toBe(2720 - 150);
  });

  it("keeps the macro split consistent with the kcal target", () => {
    const r = computeAdaptiveTargets(baseInputs({ lastTargetKcal: 2200 }), TODAY);
    expect(r.status).toBe("updated");
    if (r.status !== "updated") return;
    const fromMacros = r.protein_g * 4 + r.carbs_g * 4 + r.fats_g * 9;
    expect(Math.abs(fromMacros - r.kcal)).toBeLessThanOrEqual(20);
    // Protein anchored to trend body weight (≈79-80kg → 140-145g rounded to 5).
    expect(r.protein_g).toBeGreaterThanOrEqual(135);
    expect(r.protein_g).toBeLessThanOrEqual(150);
    expect(r.fats_g).toBeGreaterThanOrEqual(40);
    expect(r.carbs_g).toBeGreaterThanOrEqual(0);
  });

  it("targets maintenance for stay_fit", () => {
    const r = computeAdaptiveTargets(
      baseInputs({ focus: "stay_fit", lastTargetKcal: 2450 }),
      TODAY,
    );
    expect(r.status).toBe("updated");
    if (r.status !== "updated") return;
    // Target ≈ TDEE (no rate shift), within the step clamp of the last target.
    expect(Math.abs(r.kcal - r.tdee_kcal)).toBeLessThanOrEqual(150);
  });
});

describe("isRecomputeDue", () => {
  it("is due with no stored target", () => {
    expect(isRecomputeDue(null, TODAY)).toBe(true);
  });
  it("is not due within the week", () => {
    expect(isRecomputeDue("2026-07-15", TODAY)).toBe(false);
  });
  it("is due after seven days", () => {
    expect(isRecomputeDue("2026-07-14", TODAY)).toBe(true);
  });
});
