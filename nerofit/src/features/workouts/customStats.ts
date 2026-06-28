import type { CustomSession } from "@/types/db";

export type CustomStats = { count: number; streak: number };

// Separate progression for custom (generated) workouts — independent of the
// curriculum. Streak = consecutive days (ending today or yesterday) with at
// least one completed custom session.
export function customStats(sessions: CustomSession[]): CustomStats {
  const count = sessions.length;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const days = new Set(sessions.map((s) => (s.completed_at ?? s.started_at).slice(0, 10)));

  let streak = 0;
  const cursor = new Date();
  if (!days.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(iso(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { count, streak };
}
