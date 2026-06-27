// Builds a custom workout from the exercise library given the user's chosen
// parameters. Pure + deterministic for a given seed so the "Refresh" button can
// re-roll a fresh selection. Reuses the injury safety filter.
import type {
  GeneratorParams,
  GeneratorTarget,
  ProgramSection,
} from "@/types/db";
import type { LibraryExercise } from "@/lib/api/exercises";
import { allowedEquipmentTiers, isSafe, requiredSafety } from "./injuryFilter";

export type GeneratedExercise = {
  exercise: LibraryExercise;
  section: ProgramSection;
  order_index: number;
  reps: string | null;
  sets: number | null;
  rest_sec: number | null;
};

export type GeneratedWorkout = {
  title: string;
  params: GeneratorParams;
  exercises: GeneratedExercise[];
};

const TARGET_CATEGORIES: Record<GeneratorTarget, string[]> = {
  upper: ["push", "pull"],
  lower: ["legs"],
  core: ["core"],
  push: ["push"],
  pull: ["pull"],
  full: ["push", "pull", "legs", "core"],
};

const TARGET_LABEL: Record<GeneratorTarget, string> = {
  upper: "Upper Body",
  lower: "Lower Body",
  core: "Core",
  push: "Push",
  pull: "Pull",
  full: "Full Body",
};

// Focus → prescribed reps for the main (strength) work.
const FOCUS_REPS: Record<GeneratorParams["focus"], number> = {
  strength: 6,
  muscle: 10,
  endurance: 15,
};

const DIFFICULTY_TIER: Record<GeneratorParams["difficulty"], number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

function equipmentTiers(
  equipment: GeneratorParams["equipment"],
  goalsEquipment?: string,
): string[] {
  switch (equipment) {
    case "none":
      return ["bodyweight"];
    case "dumbbells":
      return ["bodyweight", "dumbbell_band"];
    case "your":
      return allowedEquipmentTiers(goalsEquipment);
    case "all_gym":
    default:
      return ["bodyweight", "dumbbell_band", "gym_full"];
  }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function generateWorkout(
  params: GeneratorParams,
  library: LibraryExercise[],
  opts: { injuries?: string[]; goalsEquipment?: string; seed?: number } = {},
): GeneratedWorkout {
  const rand = mulberry32(opts.seed ?? Math.floor(Math.random() * 1e9));
  const req = requiredSafety(opts.injuries ?? []);
  const tiers = equipmentTiers(params.equipment, opts.goalsEquipment);
  const maxTier = DIFFICULTY_TIER[params.difficulty];

  const eligible = library.filter(
    (e) =>
      isSafe(e, req) &&
      (e.equipment_tier == null || tiers.includes(e.equipment_tier)) &&
      (e.progression_tier == null || e.progression_tier <= maxTier),
  );

  const inCats = (cats: string[]) =>
    eligible.filter((e) => e.category != null && cats.includes(e.category));

  const mainPool = inCats(TARGET_CATEGORIES[params.target]);
  const warmupPool = inCats(["warmup"]);
  const cooldownPool = inCats(["mobility_stretch"]);

  const warmupN = params.warmup ? 2 : 0;
  const cooldownN = params.stretch ? 2 : 0;
  const mainMinutes = params.timeMin - warmupN * 1.5 - cooldownN;
  const mainN = clamp(Math.round(mainMinutes / 2.5), 3, 12);

  const reps = FOCUS_REPS[params.focus];
  let order = 0;
  const out: GeneratedExercise[] = [];

  for (const e of shuffle(warmupPool, rand).slice(0, warmupN)) {
    out.push({ exercise: e, section: "warmup", order_index: order++, reps: "30 sek", sets: 1, rest_sec: 15 });
  }
  for (const e of shuffle(mainPool, rand).slice(0, mainN)) {
    out.push({ exercise: e, section: "main", order_index: order++, reps: String(reps), sets: 3, rest_sec: 45 });
  }
  for (const e of shuffle(cooldownPool, rand).slice(0, cooldownN)) {
    out.push({ exercise: e, section: "cooldown", order_index: order++, reps: "30 sek", sets: 1, rest_sec: 0 });
  }

  return {
    title: `${params.timeMin} min ${TARGET_LABEL[params.target]}`,
    params,
    exercises: out,
  };
}
