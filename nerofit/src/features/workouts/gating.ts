// Elite gating for the workout curriculum.
//
// Free tier: ONLY week 1 of the beginner program. Everything else — beginner
// weeks 2-8 and every intermediate/advanced/profi program (all weeks) — needs
// the Elite entitlement. AI Coach is intentionally NOT gated (stays free).
//
// Used by the program overview to lock weeks and by the day screen as a guard.
export function isProgramWeekFree(
  level: string | undefined,
  weekNo: number,
): boolean {
  return level === "beginner" && weekNo === 1;
}

// A whole program is free to browse only if it has any free week (i.e. beginner).
export function isProgramFree(level: string | undefined): boolean {
  return level === "beginner";
}
