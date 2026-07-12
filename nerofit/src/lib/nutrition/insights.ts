// Nutrition insights: logging streak, week-at-a-glance dots, trailing intake.
// Small presentational math for the nutrition hub (Phase 16 N4).
//
// Pure module: no runtime imports, deterministic — the caller passes `today`
// as a YYYY-MM-DD key, nothing here reads the clock. Date helpers are
// intentionally duplicated from adaptive.ts to keep the modules independent.

const DAY_MS = 24 * 60 * 60 * 1000;

function toMs(key: string): number {
  return Date.parse(`${key}T00:00:00Z`);
}

function toKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays(key: string, delta: number): string {
  return toKey(toMs(key) + delta * DAY_MS);
}

/**
 * Consecutive-day logging streak ending today, or yesterday when today has
 * no logs yet (so an unlogged morning doesn't show 0). `dayKeys` are
 * YYYY-MM-DD, any order, duplicates fine.
 */
export function computeLogStreak(dayKeys: readonly string[], today: string): number {
  const logged = new Set(dayKeys);
  // Anchor on today when it's logged, otherwise give the morning grace and
  // anchor on yesterday. A gap at both means the streak is over.
  let cursor = logged.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (logged.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export type WeekDot = {
  /** YYYY-MM-DD for this slot. */
  day: string;
  /** 0..6, 0 = Monday — stable index for i18n weekday labels. */
  dayIndex: number;
  logged: boolean;
  isToday: boolean;
};

/**
 * The current Monday-anchored week as 7 entries (Mon..Sun). `logged` = that
 * day appears in `dayKeys`; days after `today` are simply logged:false.
 */
export function weekDots(dayKeys: readonly string[], today: string): WeekDot[] {
  const logged = new Set(dayKeys);
  // getUTCDay: 0=Sun..6=Sat → distance back to Monday is (d+6)%7.
  const mondayOffset = (new Date(toMs(today)).getUTCDay() + 6) % 7;
  const monday = addDays(today, -mondayOffset);

  const dots: WeekDot[] = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const day = addDays(monday, dayIndex);
    dots.push({
      day,
      dayIndex,
      logged: day <= today && logged.has(day),
      isToday: day === today,
    });
  }
  return dots;
}

/**
 * kcal per day for the trailing `days` window ending `today` (inclusive),
 * zero-filled for missing days, oldest→newest — plus the average over logged
 * (non-zero) days only, 0 when there are none. Input rows are per-day sums,
 * e.g. from dailyIntake() in adaptive.ts.
 */
export function trailingKcal(
  daily: readonly { date: string; kcal: number }[],
  today: string,
  days = 7,
): { values: number[]; avg: number } {
  const byDate = new Map<string, number>();
  for (const row of daily) byDate.set(row.date, row.kcal);

  const values: number[] = [];
  for (let ago = days - 1; ago >= 0; ago--) {
    values.push(byDate.get(addDays(today, -ago)) ?? 0);
  }

  const loggedValues = values.filter((v) => v > 0);
  const avg =
    loggedValues.length > 0
      ? Math.round(loggedValues.reduce((a, b) => a + b, 0) / loggedValues.length)
      : 0;
  return { values, avg };
}
