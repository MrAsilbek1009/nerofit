// Remote placeholder photography for onboarding choice cards.
// Not final art — swap for owned assets later. Cards fall back to a solid
// elevated surface if a URL fails to load.
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

export const FOCUS_IMAGES = {
  lose_fat: U("1538805060514-97d9cc17730c"), // sprint
  build_muscle: U("1605296867304-46d5465a13f1"), // dumbbells
  stay_fit: U("1571019613454-1cb2f99b2d8b"), // training
} as const;

export const EQUIPMENT_IMAGES = {
  no_equipment: U("1581009146145-b5ef050c2e1e"), // outdoor / bodyweight
  home_gym: U("1534438327276-14e5300c3a48"), // dumbbells at home
  full_gym: U("1517836357463-d25dfeac3438"), // full gym
} as const;
