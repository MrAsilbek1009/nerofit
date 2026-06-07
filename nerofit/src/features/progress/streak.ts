// Local-date helpers for the progress screen.

export function toLocalDayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Consecutive-day streak ending today (or yesterday if nothing logged today).
export function computeDayStreak(completedAtIso: string[]): number {
  const days = new Set(completedAtIso.map(toLocalDayKey));
  if (days.size === 0) return 0;

  const cursor = new Date();
  // If today has no session, start counting from yesterday.
  if (!days.has(toLocalDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(toLocalDayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(toLocalDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Mon-anchored start of the current week (local).
export function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  d.setDate(d.getDate() - day);
  return d;
}
