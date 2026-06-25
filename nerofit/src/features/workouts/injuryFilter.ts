// Injury-aware exercise substitution. When the user flagged an injury, any
// exercise that isn't safe for it is swapped for a safe alternative from the
// same progression_group (or dropped if none exists). See
// content/workout/onboarding_and_routing_algorithm.json (filtering_logic).

export type SafetyFlags = { knee: boolean; back: boolean; shoulder: boolean };

type SafetyFields = {
  injury_knee_safe: boolean;
  injury_back_safe: boolean;
  injury_shoulder_safe: boolean;
};

// Map the user's selected injuries (onboarding values, plus the spec's *_issue
// variants) to the safety flags that must hold.
export function requiredSafety(injuries: string[]): SafetyFlags {
  const has = (...keys: string[]) => keys.some((k) => injuries.includes(k));
  return {
    knee: has("knees", "knee_issue"),
    back: has("lower_back", "back_issue"),
    shoulder: has("shoulders", "shoulder_issue"),
  };
}

export function hasAnyInjury(req: SafetyFlags): boolean {
  return req.knee || req.back || req.shoulder;
}

// Equipment tiers the user can actually use, from their goals.equipment.
export function allowedEquipmentTiers(equipment: string | undefined): string[] {
  switch (equipment) {
    case "no_equipment":
      return ["bodyweight"];
    case "home_gym":
      return ["bodyweight", "dumbbell_band"];
    case "full_gym":
    default:
      return ["bodyweight", "dumbbell_band", "gym_full"];
  }
}

export function isSafe(ex: SafetyFields, req: SafetyFlags): boolean {
  if (req.knee && !ex.injury_knee_safe) return false;
  if (req.back && !ex.injury_back_safe) return false;
  if (req.shoulder && !ex.injury_shoulder_safe) return false;
  return true;
}

type Candidate = SafetyFields & {
  id: string;
  progression_group: string | null;
  progression_tier: number | null;
  equipment_tier: string | null;
};

// Closest safe alternative within the same progression_group: prefer a similar
// difficulty (progression_tier) and the same equipment tier.
export function pickReplacement<T extends Candidate>(
  original: Candidate,
  candidates: T[],
  req: SafetyFlags,
  allowedTiers: string[],
): T | null {
  const safe = candidates.filter(
    (c) =>
      c.id !== original.id &&
      isSafe(c, req) &&
      (c.equipment_tier == null || allowedTiers.includes(c.equipment_tier)),
  );
  if (safe.length === 0) return null;
  const score = (c: Candidate) =>
    Math.abs((c.progression_tier ?? 0) - (original.progression_tier ?? 0)) * 10 +
    (c.equipment_tier === original.equipment_tier ? 0 : 5);
  return [...safe].sort((a, b) => score(a) - score(b))[0] ?? null;
}
