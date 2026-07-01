# Phase 14 — Stabilization + Native Depth · Handoff

Branchlar: `docs/phase-14-plan` (reja, main'ga merge — PR #10, `cbc58df`),
`phase-14a-tooling-tests` (14A ish, **main'ga HALI merge qilinmagan**, `59eb639`,
muallif: MirolimSodiq).

**Holat: ⬜ boshlandi (xolos).** Bu faza MVP do'konga chiqqach yoki parallel
ravishda kod sifatini mustahkamlash + iOS native chuqurlikni qo'shish uchun.
Hozircha reja (LAUNCH_PLAN) + 14A poydevori bor.

> Audit topilmalari (LAUNCH_PLAN'dan): **0 test, CI yo'q, ESLint/Prettier yo'q,
> offline ishlov yo'q, butun ilovada atigi 2 ta accessibilityLabel.**

---

## Reja (LAUNCH_PLAN.md → Phase 14)

### 14A — Muhandislik barqarorligi (🔴 launch sifati uchun eng muhim)
| Ish | Holat |
|---|---|
| Unit testlar (makros, streak, water/serving, food-scan parse, onboarding) | 🔶 boshlandi (14A branch) |
| ESLint + Prettier + `lint`/`typecheck`/`format` scriptlar | 🔶 boshlandi (14A branch) |
| E2E smoke (Maestro: login → onboarding → workout/log) | ⬜ |
| CI (GitHub Actions: har PR'da tsc + lint + test) | ⬜ |
| Offline holatlar (NetInfo banner + TanStack Query persist/retry) | ⬜ |

### 14B — Accessibility
- accessibilityLabel'lar, screen reader, kontrast — ⬜ (LAUNCH_PLAN'da rejalashtirilgan).

---

## 14A da nima qilindi (branch `phase-14a-tooling-tests`, 🤖)

Commit `59eb639` "Phase 14A: testing + lint foundation":
- `nerofit/eslint.config.js`, `.prettierrc`, `.prettierignore` — lint/format poydevori.
- Unit testlar:
  - `src/features/home/summary.test.ts` (Home ozuqa hisob-kitobi)
  - `src/features/progress/streak.test.ts` (streak mantiqi)
  - `src/features/workouts/repsParse.test.ts` (rep parsing)
- `package.json` — test/lint paketlari va scriptlar (~25 qator o'zgarish).

> ⚠️ Bu branch (`phase-14a-tooling-tests`) **main'ga merge qilinmagan** — main'dan
> 1 commit oldinda. Muallif: akangiz (MirolimSodiq). **Uni main'ga merge qilish
> akangizning qarori** (yoki u bilan kelishib) — collaboration koordinatsiyasi.

---

## Sinash (QA) — bu fazada nimani sinash kerak

> Phase 14 asosan **kod sifati** (foydalanuvchi-yuzaki yangi funksiya yo'q).
> Sinash = ilova ishlashini emas, ishlab chiqish vositalarini tekshirish.

14A branch'ini olib (`git checkout phase-14a-tooling-tests`), `nerofit/` ichida:
```
npm install          # yangi dev paketlar (jest, eslint, prettier)
npm run lint         # ESLint o'tadimi
npm run typecheck    # tsc xatosiz
npm test             # unit testlar yashilmi (summary / streak / repsParse)
```
(Aniq script nomlarini `package.json` dagi `scripts` dan tasdiqlang.)

---

## DoD holati
- ✅ Phase 14 reja hujjati (LAUNCH_PLAN) main'da.
- 🔶 14A: ESLint/Prettier + 3 ta unit test fayli (branch'da, merge kutilmoqda).
- ⬜ CI, E2E (Maestro), offline holatlar, accessibility (14B) — hali qilinmagan.
- 🧑 `phase-14a-tooling-tests`ni main'ga merge — akangiz bilan kelishilsin.
