// Parse a program_day_exercise `reps` string into a structured target so the
// player can decide between a work countdown (timed holds) and a rep target.
// Examples seen in content: "10 sek", "30 sek har oyoq", "10 takror",
// "8 har oyoq", "10 har tomon".
export type RepsTarget = {
  // "time" → hold/duration (center ring counts the work down).
  // "reps" → a rep count the user performs, then logs.
  kind: "time" | "reps";
  // Seconds for "time", rep count for "reps". Null when no number is present.
  value: number | null;
  // The original string, for display (keeps qualifiers like "har oyoq").
  raw: string;
};

export function parseReps(reps?: string | null): RepsTarget {
  const raw = (reps ?? "").trim();
  const match = raw.match(/\d+/);
  const value = match ? Number.parseInt(match[0], 10) : null;
  const kind = /sek|сек|sec|min|daq/i.test(raw) ? "time" : "reps";
  return { kind, value, raw };
}
