---
name: expo-rn-conventions
description: Navigation, component, and file-structure conventions for the Nerofit Expo + React Native app. Load whenever adding screens, components, or wiring navigation, state, or styling.
---

# Expo + React Native — Conventions

## Routing
- Expo Router, file-based. Routes in `app/`. Grouped: `(auth)` for the login
  flow, `(tabs)` for the main shell.
- Routes stay **thin** — they compose feature modules. Real logic lives in
  `src/features/*` and `src/lib/*`. A route file should mostly be JSX +
  hook calls.
- Dynamic routes: `app/workout/[id].tsx`, `app/exercise/[id].tsx`.
- Tab bar items live in `app/(tabs)/_layout.tsx`. Active tint is `colors.accent`.

## State
- Server state → **TanStack Query only** (`src/lib/queries/`). No
  `useEffect`-based fetching in components.
- Local UI / session state → **Zustand** (`src/store/`). Keep stores small
  and feature-scoped.
- Auth session lives in `src/store/auth.ts`; bootstrapped once from the root
  layout via `bootstrapAuth()`.

## Styling
- Pull values from `@/theme`. Never write a raw hex or px in a component.
- NativeWind classes (`bg-canvas`, `text-textHi`, `rounded-pill`) map onto
  the same tokens via `tailwind.config.js` — utility and token stay in sync.
- Use `typography` presets (`@/theme`) instead of composing
  `fontFamily + size + color` inline.

## Components
- Primitives live in `src/components/ui/` and re-export from
  `src/components/ui/index.ts`.
- Composite components live in `src/features/<domain>/components/`.
- Props are typed; no `any`. Prefer named exports.

## Data screens
Every list / data screen has explicit:
- **Loading** state (Skeleton or spinner card).
- **Empty** state (centered message + optional CTA).
- **Error** state (centered message + retry).

## Performance
- `FlatList` / `FlashList` for lists, not `.map()` inside `ScrollView`.
- Memoize heavy components (`React.memo`, stable callbacks via `useCallback`).
- Images: explicit `width` / `height` to avoid layout thrash.

## Checklist before merging an app/RN change
- [ ] Route files stay thin (logic in features/lib).
- [ ] No `useEffect` fetching — use TanStack Query.
- [ ] Styling via tokens / NativeWind, not raw values.
- [ ] Loading / empty / error states present.
- [ ] TypeScript strict, no `any`.
