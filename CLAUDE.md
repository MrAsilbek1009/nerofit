# CLAUDE.md — KINETIC AI Fitness Coach

Read `ARCHITECTURE.md` for the full design before planning any non-trivial work.
This file is the quick rule set.

## What this is
iOS-first React Native (Expo) AI fitness app. Personalized video workouts,
done/skipped tracking, nutrition + supplements, AI chat coach. Design system =
"Kinetic Editorial" (true black + chartreuse, editorial typography).

## Stack (don't change without asking)
- Expo (managed) + Expo Router (file-based routes) + TypeScript (strict).
- Supabase: Postgres + Auth + Storage + Realtime + Edge Functions.
- TanStack Query (server state) + Zustand (local UI state).
- NativeWind + `src/theme/tokens.ts` for styling.
- Fonts: Hanken Grotesk (headings), Inter (body).
- `expo-video` for playback. RevenueCat for subscriptions. Expo Notifications.

## Hard rules
1. **No secrets in the app.** LLM keys and service-role keys live only in
   Supabase Edge Function secrets. Privileged work goes through Edge Functions.
2. **All DB access through `src/lib/api/*`**, typed against generated DB types
   (`src/types/db.ts`). No raw fetching inside components.
3. **Server state = TanStack Query only.** No `useEffect` data fetching.
4. **Styling = theme tokens only.** Never hardcode hex/spacing in components;
   import from `src/theme`.
5. **Accent discipline:** chartreuse (#D4E924) only on primary button, active
   nav, progress strokes, selected chips, "See All" links. Everything else is
   white/gray on true black. No glow, no card gradients.
6. **Routes stay thin.** `app/*` composes feature modules; logic lives in
   `src/features/*` and `src/lib/*`.
7. **Every list/data screen** has explicit loading, empty, and error states.
8. TypeScript strict, no `any`. RLS on every user-owned table.

## Build order (MVP)
1 Foundation (theme, primitives, nav, auth) → 2 Onboarding + Home →
3 Workouts core loop (list, details, player, logging) → 4 Progress + Nutrition →
5 AI Coach (Edge Function + chat) → 6 Monetization + i18n + polish.
Ship Phase 1–3 before starting 4–6.

## Skills (in .claude/skills/)
- `design-system` — Kinetic Editorial tokens + component patterns. Load when
  building or styling any UI.
- `supabase` — schema/RLS/migration/query-layer conventions. Load for DB work.
- `expo-rn-conventions` — navigation, component, and file-structure patterns.

## Definition of done for a screen
Matches the Stitch design, uses theme tokens, typed data via api layer,
loading/empty/error handled, no hardcoded strings (i18n keys), no secrets.

---

## Phase 1 build notes (lessons captured)

Brand & naming
- App brand = **Nerofit** (used in `app.json`, login header, splash).
- "Forge" is the AI coach persona (Phase 5 only). Never put "Forge AI" in
  general UI surfaces.
- Apple Sign In is **stubbed** (UI present, handler shows "Coming soon").
  Wire up `expo-apple-authentication` + Supabase Apple provider in a later
  phase when Apple Developer account is available.

Toolchain quirks (Expo SDK 56, RN 0.85)
- **Reanimated 4.x auto-registers its babel plugin.** Do NOT add
  `"react-native-reanimated/plugin"` to `babel.config.js` — it causes
  duplicate-plugin warnings. Keep `babel.config.js` with only
  `babel-preset-expo` (`{ jsxImportSource: "nativewind" }`) and
  `nativewind/babel`.
- `tailwind.config.js` uses `darkMode: "class"` — the whole app is dark, so
  utility classes never need a `dark:` prefix; this just keeps NativeWind
  from auto-flipping behavior based on system theme.
- `tailwindcss` must be pinned to **v3** (NativeWind v4 does not support
  Tailwind v4). If `npm install` pulls Tailwind v4, downgrade explicitly:
  `npm install --legacy-peer-deps tailwindcss@^3.4.0`.
- Use `--legacy-peer-deps` for installs that touch `expo-router`'s web
  dependency tree (peer mismatch between `react@19.2.3` and
  `react-dom@19.2.7` brought in transitively). Runtime is unaffected.
- `tsconfig.json` paths use `"@/*": ["./src/*"]` (relative). Do NOT set
  `baseUrl` — deprecated in TS 6.
- `expo-router` entry is wired via `"main": "expo-router/entry"` in
  `package.json`; `index.ts` is unused.

Repo layout (created in Phase 1)
- Project root: `nerofit/` (Expo app). Repo root holds design docs, Stitch
  PNGs in `design/screens/`, and `.claude/skills/`.
- `src/theme/` is the only source of colors, spacing, radii, fonts —
  enforced by CLAUDE.md rule #4.
- `src/components/ui/` exports primitives via `index.ts`; import as
  `import { Button } from "@/components/ui"`.
- Profile tab is currently a **primitives gallery** (dev-only). Replaced
  by the real Profile screen in Phase 6.

Supabase
- Auth uses email/password (Phase 1). Apple disabled in dashboard.
- Migration `0001_init_profiles.sql` already applied: `profiles` table,
  three RLS policies, `on_auth_user_created` trigger autocreates a
  profile row for every new auth user.
- Regenerate `src/types/db.ts` after every migration via
  `supabase gen types typescript --project-id <id>`.

---

## Phase 2–3 build notes

Phase 2 (Onboarding + Home) — shipped
- Migrations `0002_onboarding_schema.sql` (profiles extended: sex,
  date_of_birth, daily_water_goal_ml, onboarded_at; + `goals`,
  `body_metrics`) and `0003_home_metrics.sql` (`health_metrics`,
  `water_logs`). All RLS owner-only.
- i18n is live: `src/i18n` (i18next + expo-localization), locales EN/UZ/RU.
  Auto-detects device locale, EN fallback. No hardcoded UI strings — add keys
  to all three locale files.
- Onboarding = 4 steps + building loader under `app/(auth)/onboarding/`.
  Draft held in `src/features/onboarding/store.ts` (in-memory zustand),
  validated with zod (`schema.ts`), persisted by `submit.ts`.
- Auth gate (`app/_layout.tsx`) redirects signed-in users whose
  `profile.onboarded_at` is null into onboarding.
- Onboarding focus/equipment cards use remote Unsplash placeholders
  (`src/features/onboarding/images.ts`) — swap for owned art later.

Phase 3 (Workouts core loop) — shipped
- Migration `0004_workouts.sql`: catalog (`programs`, `workouts`,
  `exercises`, `workout_exercises`, `exercise_videos`) read-only to
  authenticated users; `workout_sessions` + `exercise_logs` owner-only
  (exercise_logs ownership is transitive via the session).
- `supabase/seed.sql` provides the ELITE "Full Body Power" workout. Run it
  after migrations to populate the catalog.
- Routes: `app/(tabs)/workouts.tsx` (list), `app/workout/[id].tsx`
  (details + done/skip logging), `app/exercise/[id].tsx` (expo-video player,
  set/rest tracking). Root layout is now a `Stack` (not `Slot`) so these
  push correctly; the player is a `fullScreenModal`.
- Session auto-created on opening a workout; auto-completed when every
  exercise is logged. `expo-video` added for playback.

Toolchain
- `tailwindcss` pinned at v3; `react-dom` pinned to match `react@19.2.3`.
- `experiments.typedRoutes` is **false** — `router.push` uses plain template
  strings (e.g. `/exercise/${id}?...`). If re-enabling typed routes later,
  run the app once to regen `.expo/types/router.d.ts`.
- New deps this phase: i18next, react-i18next, expo-localization, zod,
  react-hook-form, @hookform/resolvers, expo-video.

---

## Phase 4 build notes (Progress + Nutrition)

Built on branch `phase-4-progress-nutrition` (branch-per-phase strategy).
- Migration `0006_nutrition.sql`: profiles gain `protein_goal_g` /
  `carbs_goal_g` / `fats_goal_g`; new catalogs `meals`, `supplements`
  (read-only RLS) and owner-only logs `meal_logs`, `supplement_logs`
  (supplement_logs has a unique `(user_id, supplement_id, log_date)` for
  toggling). `seed.sql` extended with 5 meals + 3 supplements.
- Progress = top-level route `app/progress.tsx` (not a tab) reached from the
  Home health-metrics "See All". Reads existing tables only (body_metrics,
  workout_sessions, exercise_logs). Weight trend (period week/month/year),
  weekly-activity circles, day streak, total volume, workout count. Charts via
  `react-native-svg` (`TrendChart`). Streak/volume helpers in
  `src/features/progress/`.
- Nutrition tab: macros (today's meal_logs summed vs profile goals), meals by
  slot with add via `app/meal-picker.tsx` (modal route, `?slot=`), hydration
  ring (reuses water_logs), supplements "Protocol" with per-day toggle.
- **Food-scan AI (AI-INTEGRATION.md) deferred to Phase 5** — it needs the
  shared Edge Function scaffolding + `ANTHROPIC_API_KEY`, and the provided
  Phase-4 mocks (Progress, Nutrition) don't include a scan screen.
- No new deps. Run migrations 0006 + re-run `seed.sql` before testing.
