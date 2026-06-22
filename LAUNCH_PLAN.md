# NEROFIT — Launch Readiness Plan (Phase 7 → 12)

**Maqsad:** ilovani Play Store + App Store'ga to'liq chiqarishga tayyorlash.
**Usul:** phase-ma-phase. Har bir phase alohida branch'da, tugagach `main`'ga merge.
Siz "boshla" deganingizda navbatdagi phase boshlanadi.

> Bu reja [launch readiness auditi](#)dan kelib chiqqan 8 ta yo'nalishni
> mantiqiy fazalarga guruhlaydi.

---

## Holat / kim qaysi phase'da
> Har kim o'zi ishlayotgan phase'ni shu yerda belgilab turadi (commit + push).
> Legend: ⬜ boshlanmagan · 🟡 jarayonda · ✅ tugagan.

**Jamoa:** Asilbek (@MrAsilbek1009) · Mirolim (@MirolimSodiq)

| Phase | Mavzu | Holat | Kim ishlayapti |
|---|---|---|---|
| 7 | Auth & Account | ⬜ | — |
| 8 | Build & Backend hardening | ⬜ | — |
| 9 | Real kontent | ⬜ | — |
| 10 | RevenueCat | ⬜ | — |
| 11 | Legal & Store | ⬜ | — |
| 12 | iOS + Release | ⬜ | — |

---

## 0. UX/UI integratsiya qoidalari (HAR bir dizayn uchun majburiy)

Siz UX/UI screen yuborganingizda, men uni **ko'chirib qo'ymayman** — quyidagi
qoidalar bo'yicha bizning arxitekturaga moslayman (CLAUDE.md hard rules):

1. **Ranglar/spacing** faqat `src/theme/tokens.ts` dan. Hech qachon hardcode hex.
2. **Accent intizomi** — chartreuse (`#D4E924`) faqat primary tugma, active nav,
   progress, tanlangan chip, "See All". Qolgani oq/kulrang, true black fonda.
3. **Primitive'lar** `src/components/ui` dan (Button, Chip, Avatar, ...). Yangi
   primitive kerak bo'lsa — shu yerga qo'shamiz, screen ichida emas.
4. **Ma'lumot** faqat `src/lib/api/*` + TanStack Query orqali. `useEffect`'da
   fetch yo'q, komponent ichida raw Supabase yo'q.
5. **Matn** — hardcode string yo'q; i18n kalitlari (`en/uz/ru` uchalasiga).
6. **Route'lar yupqa** — logika `src/features/*`, `app/*` faqat kompozitsiya.
7. Har screen'da **loading / empty / error** holatlari.
8. TypeScript strict, `any` yo'q; RLS har bir user-owned jadvalda.

> Ya'ni: dizayn = **vizual manba**, lekin kod = bizning pattern. Layout, ranglar,
> tipografiya dizaynga mos bo'ladi; ulanish/struktura bizning konvensiyada.

---

## Phase 7 — Auth & Account to'liqligi
**Branch:** `phase-7-auth-account`
**Asosiy: 🤖 men. UX/UI kerak: 🧑 siz.**

| Ish | Kim | Izoh |
|---|---|---|
| Forgot / reset password oqimi | 🤖 | `resetPasswordForEmail` + deep link / reset screen |
| Email verification yoqish | 🤖 + 🧑 | Supabase'da toggle (🧑) + UI holatlari (🤖) |
| **Account deletion** (App Store majburiy) | 🤖 | Profile'da tugma + tasdiq screen + `delete-account` Edge Function (auth user + barcha user data) |
| Apple Sign In stub | 🤖 | Hozircha tugmani olib tashlash (faqat email login) yoki real qilish |

**🧑 Sizdan UX/UI:** (1) Forgot password screen, (2) "Delete account" tasdiq screen.
**DoD:** parolni tiklash ishlaydi; akkauntni o'chirish barcha ma'lumotni o'chiradi;
do'kon talablariga mos.

---

## Phase 8 — Build & Backend hardening
**Branch:** `phase-8-infra-hardening`
**Asosiy: 🤖 men (kod) + 🧑 siz (akkaunt sozlamalari). UX/UI: deyarli yo'q.**

| Ish | Kim | Izoh |
|---|---|---|
| EAS env o'zgaruvchilari | 🤖 | `eas.json` `env` / EAS variables — production build Supabase/PostHog kalitlarini olishi uchun (hozir faqat lokal Metro o'qiydi) |
| AI Coach rate-limit | 🤖 | `ai-coach` Edge Function'da foydalanuvchi bo'yicha limit (API xarajatdan himoya) |
| Crash reporting (Sentry) | 🤖 | `sentry-expo` / `@sentry/react-native` — analytics emas, xato kuzatuvi |
| Supabase Pro | 🧑 | Free tier pauza bo'ladi + backup yo'q (~$25/oy) |

**🧑 Sizdan UX/UI:** umumiy "xatolik" / fallback screen (ixtiyoriy).
**DoD:** standalone build serverga ulanadi; xatolar Sentry'da ko'rinadi; AI himoyalangan.

---

## Phase 9 — Real kontent
**Branch:** `phase-9-content`
**Asosiy: 🧑 siz (kontent) + 🤖 men (struktura).**

| Ish | Kim | Izoh |
|---|---|---|
| Mashq katalogi (programs/workouts/exercises) | 🧑 + 🤖 | Siz ro'yxat/matn; men seed + struktura |
| Egasi bo'lgan videolar | 🧑 + 🤖 | Siz video; men Supabase Storage/CDN'ga ulayman (hozir Google sample mp4) |
| Onboarding rasmlari | 🧑 + 🤖 | Unsplash placeholder o'rniga o'z art (`images.ts`) |

**🧑 Sizdan UX/UI/kontent:** mashqlar ro'yxati + videolar + onboarding art.
**DoD:** real, egalik qilingan kontent; placeholder yo'q.

---

## Phase 10 — Monetizatsiya (RevenueCat)
**Branch:** `phase-10-revenuecat`
**Asosiy: 🤖 men (kod) + 🧑 siz (do'kon mahsulotlari). UX/UI kerak: 🧑 siz.**

| Ish | Kim | Izoh |
|---|---|---|
| `src/lib/purchases.ts` | 🤖 | analytics kabi kalitsiz no-op wrapper |
| Paywall screen | 🤖 | Profile "Subscription" qatoriga ulanadi |
| `elite` entitlement gating | 🤖 | premium funksiyalarni cheklash |
| RevenueCat + do'kon mahsulotlari | 🧑 | akkaunt, offerings, App Store/Play products |

**🧑 Sizdan UX/UI:** Paywall / Subscription screen dizayni.
**DoD:** test obuna sotib olinadi, entitlement ishlaydi.

---

## Phase 11 — Legal & Store listing
**Branch:** `phase-11-legal-store`
**Asosiy: 🤖 men (matn/host) + 🧑 siz (do'kon formalari).**

| Ish | Kim | Izoh |
|---|---|---|
| Privacy Policy + Terms | 🤖 | matn + bepul host (GitHub Pages) |
| Data Safety (Google) / App Privacy (Apple) | 🤖 + 🧑 | nima yig'ilishini deklaratsiya (PostHog/Supabase/Sentry) |
| Store listing: tavsif (en/uz/ru), kategoriya, age rating | 🤖 + 🧑 | matnlar men, kiritish siz |
| Skrinshot / feature graphic | 🧑 + 🤖 | men template/yo'riq beraman |

**🧑 Sizdan UX/UI:** marketing skrinshot dizayni (ixtiyoriy).
**DoD:** privacy URL tayyor; maxfiylik formalari to'ldirilgan; listing materiallari tayyor.

---

## Phase 12 — iOS + Release
**Branch:** `phase-12-ios-release`
**Asosiy: 🧑 siz (akkauntlar) + 🤖 men (config).**

| Ish | Kim | Izoh |
|---|---|---|
| Apple Developer + iOS build profile | 🧑 + 🤖 | $99/yil; `eas.json` iOS; bundle id bor |
| TestFlight + Play internal testing | 🧑 + 🤖 | real qurilmada QA |
| `expo-notifications` plugin polish | 🤖 | Android ikonka/kanal |
| Yakuniy QA + submit | 🧑 + 🤖 | `eas submit` (submit config to'ldirish) |

**DoD:** ikkala do'konda review'ga yuborilgan.

---

## Phase ↔ 8 yo'nalish mosligi
1 Account deletion → P7 · 2 Privacy/forms → P11 · 3 EAS env → P8 ·
4 Forgot pw + email verify → P7 · 5 Real content → P9 · 6 Sentry + AI limit → P8 ·
7 RevenueCat → P10 · 8 iOS/Supabase Pro/store assets → P8/P11/P12.

## Tavsiya etilgan tartib
P7 → P8 → P9 → P10 → P11 → P12. (P9 kontentni siz parallel tayyorlashingiz mumkin.)
