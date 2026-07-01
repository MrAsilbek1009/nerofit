# Phase 13 — Home Redesign, Food Scan & Custom Workouts · Handoff

Branchlar (main'ga merge qilingan, PR #7/#8/#9): `phase-13-home-redesign`,
`phase-13-stage-b-micros`, `phase-13-stage-c-activity` (commitlar `e853186` …
`e207de1`, 2026-06-27/29, muallif: MirolimSodiq).

Bu faza Home ekranini to'liq qayta dizayn qildi, **AI food scan** (kamera orqali
ovqatni tahlil qilish), **maxsus mashq generatori (custom workouts)**, **qadam
hisoblagich (pedometer)** va **sozlanadigan suv hajmini** qo'shdi. Eng katta
fazalardan biri (~5573 qator).

> ⚠️ **DB migration + Edge Function deploy talab qiladi** (pastdagi 🧑 qadamlar).
> Pedometer va kamera **native** — telefonda dev build kerak (Expo Go emas).

---

## Nima qilindi (kod, 🤖)

### Home qayta dizayni (Stage A / B / C)
- **Stage A** — `WeekStrip.tsx` (hafta lentasi + streak), `RecentMeal.tsx`
  (oxirgi ovqat), `ProgramsSection.tsx`, ozuqa dashboard. Mantiq:
  `src/features/home/summary.ts`.
- **Stage B** — `MicrosCard.tsx` (mikronutrientlar) + **Health Score**,
  `MacroGauges.tsx` (makro o'lchagichlar).
- **Stage C** — qadamlar + kuydirilgan kaloriya (`WaterCard.tsx`, pedometer),
  steps/calories + water bitta karusel sahifasida. Pedometer native moduli
  yo'q bo'lsa — **xato bermaydi** (`src/lib/pedometer.ts` fallback).

### Food Scan (AI) — kamera → tahlil → tahrir → log
- `src/features/nutrition/scan/FoodScanFlow.tsx` (asosiy oqim, 546 qator),
  `Stepper.tsx`, `prepareImage.ts` (rasmni tayyorlash).
- `src/lib/api/foodScan.ts` — Edge Function'ni chaqiradi.
- `supabase/functions/food-analysis/index.ts` — rasmni AI bilan tahlil qilib,
  ovqat nomi + makro/mikro qaytaradi (Phase 5 `ai-coach` kabi `ANTHROPIC_API_KEY`
  ishlatadi).

### Custom Workouts (maxsus mashq tuzish)
- `src/features/workouts/generator.ts` — mashq generatori; `BodyMap.tsx`
  (tana xaritasi), `NumberPad.tsx`, `SessionExerciseList.tsx`, `StepperBox.tsx`,
  `WorkoutSettingsSheet.tsx`, `repsParse.ts`, `customStats.ts`, `exerciseImages.ts`.
- API/queries: `customWorkouts.ts`; store: `generatorDraft.ts`, `workoutSettings.ts`.

### Suv sozlamalari
- Sozlanadigan suv hajmi (serving size) + Water settings sheet.

### DB / Edge / boshqa
- Migratsiyalar: `0010_test_results`, `0011_custom_workouts`,
  `0011-mirolim_meal_micros`, `0012-mirolim_food_scans`, `0013-mirolim_water_serving`.
- Edge Function: `food-analysis`.
- i18n: en/uz/ru ga ~105 yangi kalit. `src/types/db.ts` yangilandi.

---

## 🧑 Qo'lda bajariladigan qadamlar

> ⚠️ Bu Supabase loyihasiga (orhhiqdvukshlvtqorgp) bu ishlar boshqa kompyuterda
> **allaqachon qo'llangan bo'lishi mumkin** (DB server umumiy). Avval tekshiring;
> yo'q bo'lsa quyidagilarni bajaring.

1. **Migratsiyalar** — `0010` … `0013-mirolim_*`ni tartib bilan ishga tushiring
   (SQL Editor yoki `supabase db push`).
2. **food-analysis Edge Function** — deploy qiling. Phase 5'dagi kabi muammodan
   qochish uchun **`--no-verify-jwt` bilan**:
   ```
   npx supabase functions deploy food-analysis --no-verify-jwt --project-ref orhhiqdvukshlvtqorgp
   ```
   `ANTHROPIC_API_KEY` secret allaqachon qo'shilgan (ai-coach uchun); food-analysis
   ham shuni ishlatadi.
3. **Dev build (telefon)** — pedometer (`expo-sensors`) va kamera (`expo-camera`)
   native. Yangi dev build kerak: `npx eas-cli build --profile development
   --platform android`, so'ng `npx expo start --dev-client`.

---

## Sinash (QA) — bu fazada nimani sinash kerak
1. **Home** — yangi dizayn: hafta lentasi, streak, makro/mikro kartalar, Health
   Score, oxirgi ovqat, qadamlar + kaloriya + suv karuseli.
2. **Food scan** (telefon/dev build) — Nutrition → kamera → ovqat rasmga oling →
   AI tahlil → natijani tahrirlang → log qiling. Web'da kamera ishlamaydi.
3. **Custom workout** — mashq generatori: tana xaritasidan tanlash → set/rep
   kiritish (NumberPad) → sessiyani saqlash/bajarish.
4. **Suv** — Water kartasi → sozlamalar → serving size o'zgartiring → hisob to'g'ri.
5. **Pedometer** — qadamlar ko'rsatilishi (dev build, qurilmada); modul yo'q bo'lsa
   ekran qizarmasligi kerak (xatosiz fallback).

---

## DoD holati
- ✅ Home redesign (Stage A/B/C) — dashboard, micros, Health Score, steps/water.
- ✅ Food scan (AI) — food-analysis Edge Function deploy qilingach ishlaydi.
- ✅ Custom workouts generatori.
- ✅ Sozlanadigan suv hajmi.
- 🧑 Migratsiyalar + food-analysis deploy (+ dev build kamera/pedometer uchun).
