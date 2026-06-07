# KINETIC — AI Fitness Coach · Architecture

> Mobile app (iOS-first) built in **React Native (Expo)**. AI-driven personal
> trainer: learns user data, prescribes video-based workouts, tracks
> done/skipped exercises, guides nutrition & supplements, and has an AI chat
> coach. Design system = "Kinetic Editorial" (true black + chartreuse).

This document is the **single source of truth** for the build. Commit it to the
repo root. Claude Code reads it (plus `CLAUDE.md`) before planning any work.

---

## 0. Decisions you should confirm first

These three choices shape everything. Defaults are chosen for speed + your
existing skills. Override any of them before the build starts.

| Decision | Default (recommended) | Why | Swap to |
|---|---|---|---|
| App framework | **Expo (managed) + Expo Router** | File-based routing = same mental model as Next.js; EAS Build/Update; no Xcode pain | Bare RN if you need a native module Expo can't do |
| Backend | **Supabase** | You already know its schema/RLS/query layer from the furniture project | Firebase, custom FastAPI |
| Video hosting | **Supabase Storage (MVP) → Mux later** | Cheapest to start; Mux adds adaptive streaming when you scale | Cloudflare Stream, bunny.net |

---

## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | Strict mode on |
| App framework | Expo SDK (managed) | EAS Build + EAS Update (OTA) |
| Routing/Nav | Expo Router | File-based, typed routes |
| Server state | TanStack Query | Caching, sync, optimistic updates |
| Local state | Zustand | Lightweight UI/session state only |
| Styling | NativeWind + a typed theme file | Tailwind syntax you know + design tokens |
| Fonts | Hanken Grotesk (headings), Inter (body) | via `@expo-google-fonts` |
| Forms | react-hook-form + zod | Onboarding, profile edits |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) | |
| Auth | Supabase Auth | Email + Apple Sign In (iOS requirement) |
| Video playback | `expo-video` | Streams from Storage/Mux |
| AI coach | Supabase Edge Function → LLM provider | Provider-swappable; keys never in the app |
| Push | Expo Notifications | Workout / water / supplement reminders |
| Subscriptions | RevenueCat | Wraps App Store / Play; the "Elite" tier |
| Charts | victory-native or react-native-svg | Weight trend, metrics |

> **Security rule:** the app NEVER holds the LLM API key or any service-role
> key. All AI and privileged DB calls go through Supabase Edge Functions using
> the user's auth token. RLS enforces row ownership.

---

## 2. Folder structure

```
kinetic/
├── app/                          # Expo Router routes
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── onboarding/           # multi-step: about → focus → equipment → building
│   ├── (tabs)/
│   │   ├── _layout.tsx           # bottom nav: Home, Workouts, Nutrition, Coach, Profile
│   │   ├── index.tsx             # Home dashboard
│   │   ├── workouts.tsx
│   │   ├── nutrition.tsx
│   │   ├── coach.tsx
│   │   └── profile.tsx
│   ├── workout/[id].tsx          # Workout details
│   ├── exercise/[id].tsx         # Exercise video player
│   ├── progress.tsx
│   └── _layout.tsx               # root: fonts, providers, auth gate
├── src/
│   ├── components/
│   │   ├── ui/                   # Button, Card, Chip, ProgressRing, StatRow, Section…
│   │   └── …                     # composite components
│   ├── features/                 # feature modules (self-contained)
│   │   ├── workouts/
│   │   ├── nutrition/
│   │   ├── coach/
│   │   ├── progress/
│   │   └── onboarding/
│   ├── lib/
│   │   ├── supabase.ts           # client
│   │   ├── api/                  # typed data functions per domain
│   │   └── queries/              # TanStack Query hooks
│   ├── theme/
│   │   ├── tokens.ts             # colors, spacing, radii (Kinetic Editorial)
│   │   └── typography.ts
│   ├── store/                    # zustand stores
│   ├── hooks/
│   └── types/                    # shared + generated DB types
├── supabase/
│   ├── migrations/               # SQL schema + RLS
│   ├── functions/
│   │   └── ai-coach/             # Edge Function proxying the LLM
│   └── seed.sql
├── assets/                       # fonts, icons, images
├── .claude/
│   └── skills/                   # design-system, supabase, expo-rn-conventions
├── CLAUDE.md
└── ARCHITECTURE.md
```

**Rule of thumb:** routes in `app/` stay thin — they compose feature modules.
Real logic lives in `src/features/*` and `src/lib/*`.

---

## 3. Design system → code

The "Kinetic Editorial" tokens, encoded once in `src/theme/tokens.ts`:

```ts
export const colors = {
  canvas:    '#000000', // true black background
  surface:   '#0E0E0E', // near-black surfaces
  elevated:  '#1A1A1A', // cards / active states
  accent:    '#D4E924', // chartreuse — use SPARINGLY
  textHi:    '#FFFFFF',
  textLo:    '#8A8A8A', // muted gray
  border:    '#1F1F1F',
};
export const radii   = { sm: 8, md: 16, pill: 999 };
export const space   = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 };
```

Typography: Hanken Grotesk for display/headline (bold, large, editorial), Inter
for body/labels. Label-caps = Inter uppercase, letter-spacing, small.

**Accent discipline (the rule that kept the design good):** chartreuse appears
only on the primary button, the active nav item, progress ring/line strokes,
selected chips, and section "See All" links. Everything else is white + gray on
black. No glow, no gradients on cards, no colored hero blocks.

UI primitives to build first (everything composes from these):
`Button` (primary pill / secondary outline), `Card` (borderless on elevated),
`Chip` (pill, selectable), `ProgressRing`, `ProgressLine`, `StatRow`,
`SectionHeader` (title + optional "See All"), `Avatar`, `VideoCard`.

---

## 4. Data model (Supabase / Postgres)

All tables have RLS: a row is readable/writable only by its owner
(`auth.uid() = user_id`), except shared catalog tables (programs, exercises,
supplements) which are read-only to all authenticated users.

**Identity & profile**
- `profiles` — id (=auth user), name, avatar_url, focus, subscription_tier
- `body_metrics` — user_id, recorded_at, weight, height, body_fat (time series)
- `goals` — user_id, type (lose_fat | build_muscle | stay_fit), target_weight,
  equipment, activity_level, injuries[]

**Workouts (catalog + logs)**
- `programs` — id, title, level, image_url, description (catalog)
- `workouts` — id, program_id, title, est_minutes, est_kcal, order
- `exercises` — id, title, target_muscles[], default_sets, default_reps
- `workout_exercises` — workout_id, exercise_id, sets, reps, rest_sec, order
- `exercise_videos` — exercise_id, url, duration_sec, provider
- `workout_sessions` — user_id, workout_id, started_at, completed_at, status
- `exercise_logs` — session_id, exercise_id, status (done | skipped),
  sets_done, reps_done, weight_used, logged_at

**Nutrition & supplements**
- `meals` — id (catalog), name, kcal, protein, carbs, fats, image_url
- `meal_logs` — user_id, meal_id, slot (breakfast|lunch|dinner), date
- `supplements` — id, name, default_dose, time_of_day (catalog)
- `supplement_logs` — user_id, supplement_id, taken, date
- `water_logs` — user_id, amount_ml, logged_at

**Health metrics**
- `health_metrics` — user_id, type (heart_rate|blood_pressure|steps),
  value, recorded_at (feeds the dashboard cards)

**AI coach**
- `chat_threads` — user_id, created_at, title
- `chat_messages` — thread_id, role (user|assistant), content, created_at

> Generate TypeScript types from the schema (`supabase gen types`) into
> `src/types/db.ts` so the whole app is typed end-to-end.

---

## 5. Screen → data map

| Screen | Reads | Writes |
|---|---|---|
| Onboarding | — | profiles, goals, body_metrics |
| Home dashboard | profiles, today's workout_session, health_metrics, water_logs | — |
| Workouts list | programs, workouts | — |
| Workout details | workout_exercises, exercise_videos, current session | exercise_logs (done/skip) |
| Exercise player | exercise_videos, workout_exercises | exercise_logs |
| Progress | body_metrics, workout_sessions, exercise_logs | — |
| Nutrition | meals, meal_logs, supplements, supplement_logs, water_logs | logs |
| AI Coach | chat_threads, chat_messages | chat_messages (via Edge Function) |
| Profile | profiles, goals, subscription | profiles, goals |

---

## 6. AI Coach flow (secure)

```
App  →  POST /functions/v1/ai-coach (user JWT, thread_id, message)
Edge Function:
  1. verify JWT, load thread context (last N messages) + the user's profile,
     goals, recent sessions  → builds a system prompt with real context
  2. call LLM provider (Anthropic / Groq / OpenAI — one swappable adapter)
  3. stream response back; persist user + assistant messages to chat_messages
App  →  renders streamed reply; AI replies may embed a workout/meal card
```

Provider key lives only in the Edge Function's secrets. The app never sees it.

---

## 7. MVP phasing (build order for plan mode)

**Phase 1 — Foundation**
Project scaffold, theme/tokens, UI primitives, fonts, navigation shell, Supabase
client + auth gate, login + Apple Sign In.

**Phase 2 — Onboarding + Home**
Onboarding flow → writes profile/goals/body_metrics. Home dashboard reading real
data. Empty/loading/error states.

**Phase 3 — Workouts (core loop)**
Programs/workouts list, workout details, exercise video player, done/skip
logging, session completion. This is the heart of the product.

**Phase 4 — Progress + Nutrition**
Progress charts from logged data; nutrition meals/macros/water; supplements.

**Phase 5 — AI Coach**
Edge Function + chat UI + streaming + context injection.

**Phase 6 — Monetization + polish**
RevenueCat "Elite" tier, push notifications, settings, analytics, Uzbek
localization pass (i18n).

> Ship Phase 1–3 as a usable internal build before touching 4–6.

---

## 8. Localization (Uzbek)

Use `i18n` (e.g. `i18next` + `expo-localization`) from Phase 2, with keys not
hardcoded strings — so UZ / RU / EN are swappable. Account for longer Uzbek
words in button/label widths. Keep the `oʻ` / `gʻ` characters consistent
(turned comma U+02BB), defined once in the locale file.

---

## 9. Conventions (also enforced via CLAUDE.md)

- TypeScript strict; no `any`.
- Server state → TanStack Query only. No fetching in components directly.
- All DB access through `src/lib/api/*`, typed against generated DB types.
- Styling through theme tokens / NativeWind — never hardcode hex in components.
- One screen file = thin; logic in feature modules.
- Never commit secrets. Privileged calls go through Edge Functions.
- Every list screen has explicit loading, empty, and error states.
