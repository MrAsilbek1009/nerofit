# 🔴 WORKOUT TRACK — VAQTINCHA YASHIRIN (DEFERRED)

> ⚠️ **DIQQAT:** Workout (mashg'ulot dasturi) track'i **ataylab yashirilган**.
> Nerofit hozir **zal-markazli** (fitness zal abonementi asosiy funksiya).
> Workout track **o'chirilmagan** — kodi to'liq turibдi, faqat **ko'rinmaydi**.
> **Kelajakда qaytади.** Quyida qanday qaytarish yozilган.

---

## 🔴 Nima yashirilган (2026-07-01)

| Joy | O'zgarish | Fayl |
|---|---|---|
| Workouts **tab** | `href: null` (tab-bar tugmasi yo'q) | `nerofit/app/(tabs)/_layout.tsx` |
| Home **dastur bloki** | `<ProgramsSection />` olib tashlandi | `nerofit/app/(tabs)/index.tsx` |

Barcha workout **route'lari va kodi joyida** (`app/program/*`, `app/program-day/*`,
`app/(tabs)/workouts.tsx`, `src/features/workouts/*`, seed, migratsiyalar) — faqat
foydalanuvchiга ko'rsatilmaydi.

## 🟢 Qanday qaytarish (RESTORE)

1. `_layout.tsx`да Workouts `Tabs.Screen`дан **`href: null`** qatorini o'chiring.
2. `index.tsx`да `<ProgramsSection />`ни (va importini) qaytaring.
3. A'zolik tab'i qo'shilган bo'lsa — tab-bar joylashuvини qayta ko'rib chiqing
   (a'zolik + workout ikkalasи; workout'ni Home kartasi qilib qoldirish mumkin).

## Bog'liq
- To'liq gym-pivot rejasi: `GYM_MEMBERSHIP_PLAN.md`
- Workout curriculum ishi (advanced/profi + seed): `feature/workout-full-curriculum` branch
- Elite gating (workout premium, hozir ishlatilmaydi): `feature/elite-gating` branch
