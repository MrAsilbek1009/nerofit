// Onboarding routing brain (pure, no LLM). Maps body metrics + experience to a
// training frequency and a program entry-point week. See content/workout
// onboarding_and_routing_algorithm.json.
import type { ExperienceValues } from "./schema";

export type Frequency = "standard_3day" | "high_4day" | "weight_adapted_3day";
export type ExperienceLevel = ExperienceValues["experience_level"];

export function computeBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return m > 0 ? weightKg / (m * m) : 0;
}

// First matching rule wins (top → bottom), per the spec table.
export function recommendFrequency(bmi: number, age: number): Frequency {
  if (bmi >= 30) return "weight_adapted_3day";
  if (bmi >= 25 && age >= 40) return "weight_adapted_3day";
  return "standard_3day";
}

// Where in the program a user starts. "experienced" would normally take a
// technique check (deferred) — we start them a little further in for now.
export function entryPointWeek(level: ExperienceLevel): number {
  switch (level) {
    case "some_experience":
      return 3;
    case "experienced":
      return 5;
    default:
      return 1;
  }
}
