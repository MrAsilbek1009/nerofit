# Phase 6 — Profile & Settings · Handoff

Branch: `phase-6` (main'ga merge qilingan — `3042fb6 Merge Phase 6`)

Bu fazada **real Profile ekrani**, **til almashtirish (language switcher)**,
**Body Composition** (tana o'lchovlari) ekrani va **tab i18n** qo'shildi. Phase 1
dagi vaqtinchalik "primitives gallery" Profile o'rnini to'laqonli ekran egalladi.
Kod tayyor — bu fazada qo'shimcha Supabase/qo'lda sozlama **talab qilinmaydi**
(body_metrics jadvali Phase 3/4 da yaratilgan).

---

## Nima qilindi (kod, 🤖)

**Real Profile ekrani** — `app/(tabs)/profile.tsx`
- Foydalanuvchi identifikatsiyasi: Avatar + ism (`useProfile`), maqsad/fokus
  chiplari (`useGoals`).
- **Body Composition**'ga o'tish qatori — oxirgi vazn/bo'y/yog' foizini
  ko'rsatadi (`useLatestBodyMetric`), bosilganda `body-composition` ekraniga.
- **Til tanlash (language switcher)** — uz / ru / en o'rtasida almashtirish.
- Sign out qatori.
- Eslatma: keyingi fazalar (7–13) bu ekranga bildirishnomalar, analytics,
  huquqiy havolalar, hisobni o'chirish va obuna holatini qo'shdi — ular Phase 6
  doirasida emas.

**Body Composition ekrani** — `app/body-composition.tsx` (yangi)
- Vazn (kg), bo'y (cm), tana yog'i (%) kiritish maydonlari (`MetricInput`).
- Oxirgi yozuvni placeholder sifatida ko'rsatadi (`useLatestBodyMetric`);
  bo'sh qoldirilgan maydon uchun avvalgi qiymat saqlanadi.
- Saqlash → `useAddBodyMetric` → muvaffaqiyatда orqaga qaytadi.
- Klaviatura oqimi: vazn → bo'y → yog' (next/done tugmalari).
- `app/_layout.tsx` ga `body-composition` route qo'shildi.

**Til almashtirish infratuzilmasi** — `src/i18n/index.ts`
- `SUPPORTED_LOCALES = ["en","uz","ru"]`.
- `pickInitialLocale()` — qurilma tilini avtomatik tanlaydi (qo'llab-quvvatlansa),
  aks holda `en`.
- `setLocale(locale)` — tilni o'zgartiradi va AsyncStorage (`app-locale`) ga
  saqlaydi; ilova qayta ishga tushganda tanlangan til tiklanadi.

**Tab i18n** — `app/(tabs)/_layout.tsx`
- Tab nomlari (Home / Workouts / Nutrition / Coach / Profile) tarjima kalitlari
  orqali — tanlangan tilga moslashadi.

**Login web tuzatishi** — `app/(auth)/login.tsx`
- Web'da input fokus halqasini (outline) tartibga keltirish.

**i18n kalitlari** — `src/i18n/locales/{en,uz,ru}.json`
- Har uchala tilga ~43 yangi kalit (profile.*, bodyComp.*, tab nomlari).

---

## Sinash (QA)

**Profile + til:**
1. Profile tabini oching → ism, maqsad chiplari, Body Composition qatori ko'rinadi.
2. Til tanlashni o'zgartiring (uz/ru/en) → matnlar darhol almashadi.
3. Ilovani yopib qayta oching → tanlangan til saqlanib qolgan bo'lishi kerak.

**Body Composition:**
1. Profile → Body Composition qatori → ekran ochiladi.
2. Vazn/bo'y/yog' kiriting (yoki bittasini) → Saqlash.
3. Orqaga qaytadi; qayta kirsangiz, kiritgan qiymatlar placeholder sifatida ko'rinadi.

---

## DoD holati
- ✅ Real Profile ekrani (identity + maqsad + sign out).
- ✅ Body Composition kiritish ekrani (bodyMetrics bilan ulangan).
- ✅ Til almashtirish — uz/ru/en, qurilmada saqlanadi.
- ✅ Tab nomlari i18n.
- ✅ Login web outline tuzatildi.
- 🧑 Qo'lda sozlama yo'q (DB jadvallari mavjud edi).
