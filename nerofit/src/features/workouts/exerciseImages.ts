// Placeholder photography for exercises by category, until owned demo clips /
// photos land (mirrors src/features/onboarding/images.ts). The exercise's own
// image_url wins when present; otherwise we pick a category shot, then a
// generic training fallback. All ids are known-good Unsplash photos.
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

const BY_CATEGORY: Record<string, string> = {
  push: U("1605296867304-46d5465a13f1"), // dumbbells
  pull: U("1534438327276-14e5300c3a48"), // dumbbells at home
  legs: U("1517836357463-d25dfeac3438"), // full gym
  core: U("1571019613454-1cb2f99b2d8b"), // training
  cardio: U("1538805060514-97d9cc17730c"), // sprint
  warmup: U("1581009146145-b5ef050c2e1e"), // outdoor / bodyweight
  mobility_stretch: U("1581009146145-b5ef050c2e1e"),
};

const FALLBACK = U("1571019613454-1cb2f99b2d8b");

export function exerciseImage(
  exercise?: { image_url?: string | null; category?: string | null } | null,
): string {
  if (exercise?.image_url) return exercise.image_url;
  return BY_CATEGORY[exercise?.category ?? ""] ?? FALLBACK;
}
