---
name: supabase
description: Supabase schema, RLS, migration, and query-layer conventions for the Nerofit app. Load whenever working with the database, writing migrations, adding API functions, or wiring Edge Functions.
---

# Supabase — Conventions

The app's Postgres lives in Supabase. The mobile app NEVER holds the
service-role key. Privileged work happens in Edge Functions; everything else
goes through the typed API layer with RLS enforced.

## Schema & RLS
- All user-owned tables have RLS enabled. Default policy shape:
  `using (auth.uid() = user_id)` for select; same in `with check` for
  insert/update; delete only if the feature needs it.
- Catalog tables (`programs`, `workouts`, `exercises`, `meals`,
  `supplements`) are read-only to all authenticated users.
- Reference identity via `references auth.users(id) on delete cascade`.
- Use `timestamptz` (never `timestamp`). Default to `now()`.

## Migrations
- One file per change, prefixed by zero-padded number: `supabase/migrations/NNNN_*.sql`.
- Idempotent where possible (`create table if not exists`, `drop trigger if exists`).
- After each migration, regenerate types:
  ```
  supabase gen types typescript --project-id <id> > src/types/db.ts
  ```

## Query layer (CLAUDE.md rule #2)
- All DB access goes through `src/lib/api/<domain>.ts` functions typed against
  `Database` from `src/types/db.ts`. Components never call `supabase.from(...)`
  directly.
- Hooks in `src/lib/queries/` wrap api functions with TanStack Query.
- Mutations use `useMutation` and invalidate the related query keys.

## Edge Functions
- Live in `supabase/functions/<name>/index.ts`. Verify the user JWT first
  (`supabase.auth.getUser()`), then do privileged work.
- Secrets (`ANTHROPIC_API_KEY`, service-role key) live only in
  `supabase secrets set ...`. Never in the app, never in git.

## Checklist before merging DB work
- [ ] Migration file added under `supabase/migrations/` with proper number.
- [ ] RLS enabled on every user-owned table.
- [ ] Types regenerated into `src/types/db.ts`.
- [ ] Component code goes through `src/lib/api/*`, not raw client calls.
- [ ] No secrets in app code.
