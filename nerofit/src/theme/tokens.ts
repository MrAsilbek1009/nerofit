// Kinetic Editorial design tokens — single source of truth.
// Never hardcode hex / spacing / radii in components. Import from here.

export const colors = {
  canvas: "#000000", // true black background
  surface: "#0E0E0E", // near-black surfaces
  elevated: "#1A1A1A", // cards / active states
  accent: "#D4E924", // chartreuse — use SPARINGLY
  textHi: "#FFFFFF",
  textLo: "#8A8A8A", // muted gray
  border: "#1F1F1F",
  danger: "#FF6B6B", // destructive actions only (log out, delete account)
  // Macro accents — used ONLY on macro rings/dots (the "hybrid" exception to
  // accent discipline). Muted so they sit calmly on true black.
  protein: "#F87171",
  carbs: "#F5A623",
  fats: "#5B9BD5",
  streak: "#FF8A3D", // streak flame only
} as const;

export const radii = {
  sm: 8,
  md: 16,
  pill: 999,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
} as const;

export const fonts = {
  display: "HankenGrotesk_700Bold",
  heading: "HankenGrotesk_600SemiBold",
  body: "Inter_400Regular",
  bodyMed: "Inter_500Medium",
  label: "Inter_600SemiBold",
} as const;

export type ThemeColor = keyof typeof colors;
export type ThemeRadius = keyof typeof radii;
export type ThemeSpace = keyof typeof space;
export type ThemeFont = keyof typeof fonts;
