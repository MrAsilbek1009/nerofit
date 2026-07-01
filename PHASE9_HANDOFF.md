# Phase 9 — Workout Curriculum · Handoff

Branchlar (main'ga merge qilingan): `phase-9-w*`, `phase-9-injury-filter`,
`phase-9-w6-gamification` (commitlar `1867838` … `ea23799`, 2026-06-24/25).

Bu faza ilovaning **asosiy mahsulot yadrosini** — kun-asosidagi **mashq
o'quv dasturini (curriculum)** — qo'shdi: 8 haftalik boshlang'ich dastur, 87 ta
mashqdan iborat kutubxona, kun-pleeri, onboarding'ga moslab yo'naltirish,
mashq videolari, gamifikatsiya (XP / bosqich bannerlari) va jarohatga moslashgan
mashq almashtirish. Ish hafta-bo'yi (W1–W6) bosqichma-bosqich qilingan.

> ⚠️ Bu faza **DB migration + seed talab qiladi** — pastdagi 🧑 qadamlar bajarilmasa,
> curriculum bo'sh ko'rinadi.

---

## Nima qilindi (kod, 🤖)

### W1 — Sxema (DB)
- `supabase/migrations/0008_workout_curriculum.sql` — curriculum tuzilishi:
  dasturlar, hafta/kunlar (`program_days`), kun-mashqlari
  (`program_day_exercises`), kun-tasklari (`program_day_tasks`), mashq kutubxonasi
  (xavfsizlik bayroqlari: `injury_knee/back/shoulder_safe`, `progression_group`,
  `progression_tier`, `equipment_tier`).
- `supabase/migrations/0009_workout_progress.sql` — har-foydalanuvchи progressi:
  - `day_sessions` — (user, program_day) bo'yicha bitta urinish (active/completed).
  - `day_exercise_logs` — kun ichidagi har mashq logи (sets/reps/weight).
  - `task_completions` — ta'lim/turmush/challenge tasklarining bajarilishi.
  - Hammasi **owner-only RLS** (`day_sessions` orqali transitiv egalik).
- `src/types/db.ts` — yangi jadvallar uchun TypeScript turlari.

### W2 — Kontent (seed)
- `content/workout/exercise_library.json` — **87 ta mashq** (xavfsizlik, jihoz tieri,
  progression guruhlari bilan).
- `content/workout/beginner_phase1_weight_adapted_weeks1-4.json` va `…weeks5-8.json`
  — **8 haftalik boshlang'ich dastur** kontenti.
- `scripts/build-workout-seed.mjs` — JSON kontentdan `seed_workout.sql` generatori.
- `supabase/seed_workout.sql` — DB'ga yuklanadigan tayyor seed (399 qator).

### W3 — Ko'rish UI + pleer
- `app/program/[id].tsx` — dastur umumiy ko'rinishi (haftalar/kunlar).
- `app/program-day/[id].tsx` — bitta kun ko'rinishi (mashqlar + tasklar).
- `app/program-day-player/[id].tsx` — kun-sessiyasi pleeri (mashqlarni birma-bir
  bajarish, log yozish).
- `app/(tabs)/workouts.tsx` — curriculum'ga kirish nuqtasi.

### W4 — Onboarding + yo'naltirish "miyasi"
- `app/(auth)/onboarding/experience.tsx` — yangi "tajriba darajasi" qadami.
- `src/features/onboarding/routing.ts` — foydalanuvchining javoblariga qarab
  **qaysi haftadan boshlashни** (`entry_point_week`) hisoblaydi.
- `schema.ts` / `store.ts` / `submit.ts` — onboarding'ga tajriba maydoni qo'shildi.
- Dastur ko'rinishida `entry_point_week` ko'rsatiladi.

### W5 — Mashq videolari
- Exercise pleer playback infratuzilmasi (`expo-video`).
- Videolarni Supabase Storage'ga yuklash uchun upload skripti.

### W6 — Gamifikatsiya
- Task bajarish + **XP** (bajarilgan mashq/tasklardan).
- Fitness-test loglash + **bosqich (milestone) banneri**.

### Jarohatga moslashish
- `src/features/workouts/injuryFilter.ts`:
  - `requiredSafety(injuries)` — onboarding jarohatlarini knee/back/shoulder
    xavfsizlik bayroqlariga map qiladi.
  - `allowedEquipmentTiers(equipment)` — jihozga qarab ruxsat etilgan tierlar
    (no_equipment→bodyweight, home_gym→+dumbbell_band, full_gym→+gym_full).
  - `isSafe()` + `pickReplacement()` — xavfsiz bo'lmagan mashqни bir xil
    `progression_group` ichidan eng yaqin (tier + jihoz) xavfsiz muqobil bilan
    almashtiradi (yo'q bo'lsa — tushirib qoldiradi).

### API / Queries / i18n
- `src/lib/api/curriculum.ts`, `curriculumSession.ts` — DB so'rovlari.
- `src/lib/queries/curriculum.ts`, `curriculumSession.ts`, `keys.ts` — TanStack hooks.
- i18n: en/uz/ru ga yangi kalitlar.

---

## 🧑 Qo'lda bajariladigan qadamlar

> Migration va seed bo'lmasa, dastur ko'rinmaydi.

1. **Migratsiyalarni qo'llang** — `0008_workout_curriculum.sql` va
   `0009_workout_progress.sql`ni Supabase'da ishga tushiring (SQL Editor orqali,
   yoki `supabase db push` CLI bilan), tartib bilan.
2. **Workout seed'ini yuklang** — `supabase/seed_workout.sql`ni SQL Editor'da
   ishga tushiring (87 mashq + 8 haftalik dastur). Kontent o'zgarsa, avval
   `node scripts/build-workout-seed.mjs` bilan qayta generatsiya qiling.
3. **Mashq videolari (W5, ixtiyoriy)** — videolarni Supabase Storage'ga upload
   skripti orqali yuklang; videosiz pleer matn/rasm bilan ishlaydi.

---

## Sinash (QA)

1. **Onboarding** — yangi "tajriba" qadami chiqadi; tugagach foydalanuvchи
   to'g'ri `entry_point_week`ga yo'naltiriladi.
2. **Dastur** — Workouts → dastur ochiladi (haftalar/kunlar ko'rinadi).
3. **Kun pleeri** — kun → "boshlash" → mashqlarni log qiling → kun yakunlanadi
   (XP/bosqich banneri ko'rinadi).
4. **Jarohat** — onboarding'da jarohat belgilang → o'sha guruh mashqlari xavfsiz
   muqobilga almashganini tekshiring.
5. **Tasklar** — ta'lim/turmush tasklarини belgilang → `task_completions`ga yoziladi.

---

## DoD holati
- ✅ Curriculum sxemasi (0008) + progress (0009), owner-only RLS.
- ✅ 87 mashq kutubxonasi + 8 haftalik boshlang'ich dastur (seed).
- ✅ Dastur → kun → sessiya pleeri ekranlari.
- ✅ Onboarding tajriba qadami + entry-week yo'naltirish.
- ✅ Mashq video infratuzilmasi.
- ✅ Gamifikatsiya: XP + bosqich banneri + fitness-test.
- ✅ Jarohatga moslashgan mashq almashtirish.
- 🧑 Migratsiya + seed (va ixtiyoriy video upload) qo'lda bajarilishi shart.
