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
| 7 | Auth & Account | ✅ | Mirolim — merged (PR #1) + `delete-account` deployed |
| 8 | Build & Backend hardening | ✅ | Mirolim — merged (PR #2): AI rate-limit, Sentry, EAS env; `ai-coach` deployed |
| 9 | Real kontent (Workout Track) | 🟡 | Claude — W1–W4 ✅ · W5 video infra ✅ · W6 ✅ (task+XP, test, milestone) · injury filtr ✅ · barchasi main'ga merged · qoldi: real video (trener), technique-check |
| 10 | RevenueCat | 🟡 | Mirolim — kod (wrapper/paywall/entitlement); gate yo'q (qaror) · 🧑 RC akkaunt/mahsulot → `PHASE10_HANDOFF.md` |
| 11 | Legal & Store | 🟡 | Mirolim — privacy/terms (docs/) + ilova havolalari + store listing/data-safety · 🧑 [TO FILL] + Pages + formalar → `PHASE11_HANDOFF.md` |
| 12 | iOS + Release | ⬜ | — |
| 13 | Home redesign (Cal AI uslubi, gibrid) | 🟡 | Mirolim — Bosqich A ✅ (week strip, calories ring, makro gauges, water carousel, recently logged) · qoldi: B micros/health-score, C steps, D food-scan |

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
9. **Kiritish uslubi** — cheklangan qiymatlar (yosh, bo'y, vazn, sana, tanlovlar)
   uchun **yozish emas**, wheel/scroll picker (`components/ui/WheelPicker`) yoki
   tile/chip tanlov. Klaviatura faqat erkin matn (email, parol, izoh) uchun.

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

---

# Workout Track — batafsil reja (Phase 9 yadrosi)

> **Manba:** `design/workout/` — onboarding+routing algoritmi, ~70 mashqli kutubxona,
> beginner Phase 1 dasturi (weight_adapted, 1–8 hafta), Peloton Strength+ uslubidagi
> ekranlar.
>
> **Qaror 1 — bitta rejim:** hozir faqat berilgan beginner Phase 1 kontenti bilan
> boshlanadi. Schema ko'p-rejimni (standard/high) keyin **migration'siz** qabul qiladi —
> faqat yangi `programs` + `program_days` qatorlari qo'shiladi.
>
> **Qaror 2 — til:** kontent matni hozir faqat o'zbekcha (name_uz, session_title…).
> To'liq i18n (uz/ru/en) keyingi bosqich; hozir uz matn saqlanadi.
>
> **Video bog'liqligi:** barcha mashq/dars videolari `needed` — trener yozadi (W5).
> UI/seed videolarsiz, placeholder bilan quriladi.

## W1 — Schema redesign (migration 0008 + 0009)

**Kengaytiriladi `exercises`** (mavjud ustunlar saqlanadi):
`name_uz`, `category` (push|pull|legs|core|cardio|warmup|mobility_stretch),
`equipment_tier` (bodyweight|dumbbell_band|gym_full), `progression_tier` (1–3),
`progression_group`, `injury_knee_safe`/`injury_back_safe`/`injury_shoulder_safe` (bool),
`cues_uz`, `default_sets_reps` (text). `title` = name_en.

**Yangi `program_days`** (kurrikulum birligi = bir kun):
id, program_id, week_no, day_no(1–7), weekday, session_title, intro_video_script(null),
is_rest_day, is_test_day, is_milestone_day, format(standard|circuit), rounds(null),
total_duration_min, order_index, intro_video_url(null).

**Yangi `program_day_exercises`** (warmup/main/cooldown):
id, program_day_id, section(warmup|main|cooldown), order_index, exercise_id,
sets(null), reps(text — "8" / "20 sek" / "8 har oyoq"), rest_sec(null),
rest_after_sec(null, circuit), notes(null).

**Yangi `program_day_tasks`** (education/lifestyle/challenge):
id, program_day_id, order_index, type, title, duration_min(null), target(null),
optional(bool), reward_xp(null), linked_to(null), video_url(null).

**Yangi `program_day_tests`** (fitness test kunlari):
id, program_day_id, order_index, test_key, name, exercise_id(null), instructions, log_type(count|seconds|minutes).

**Kengaytiriladi `programs`:** + phase(int=1), + mode(text='standard', null) — kelajak ko'p-rejim.

**Progress (0009):** hozirgi `workout_sessions`/`exercise_logs` kunlik modelga moslanadi —
`day_sessions` (user_id, program_day_id, started/completed, status, RLS owner-only),
`day_exercise_logs` (sets_done, reps_done, weight_used, status), `task_completions`.

**profiles:** + `preferred_unit_system` (metric|imperial).
**goals:** + `experience_level`, + `entry_point_week` (int=1), + `training_frequency` (text).

➡️ Migration so'ng `src/types/db.ts` qayta generatsiya + `src/lib/api/*` & queries.

## W2 — Kontent seed
~70 mashq (`exercise_library.json`) + beginner Phase 1 (8 hafta) — `seed.sql` ga
upsert (fixed UUID/keylar, qayta-ishga-tushiriladigan). Videolar placeholder.

## W3 — Workout UI (design'ga mos, design-system bilan)
1. **Bugun / Program** — joriy hafta·kun, bugungi sessiya kartasi, hafta ko'rinishi (mashq/dam/test belgilari).
2. **Sessiya ro'yxati** — Warm Up / Main / Cooldown bo'limlari + tasks (education video, lifestyle, challenge) + mashq qatorlari (thumbnail, set×rep, ✓).
3. **"Get ready for …"** sanoq + swipe-to-begin.
4. **Player** — video, Set X/Y, reps + weight stepper + raqamli keypad (log), rest ring, **auto-pilot** (timer tugaganda avto-o'tish), settings sheet (audio/auto-pilot), pause → Resume/End.
5. **Yakunlash** — natijalar, Save.

## W4 — Onboarding/routing kengayishi (hozirgi onboarding'ni qayta shakllantiradi)
+ name, + unit auto-detect (kg↔lb toggle → preferred_unit_system),
experience_level → entry_point_week, training_frequency, injury (tizza/bel/yelka —
hozirgi 5-injury ro'yxati shunga moslanadi). BMI+yosh routing (client/Edge, LLM yo'q)
→ entry_point_week (1/3/5); "1 rejim"da rejim tanlash sodda. experienced → technique check.

## W5 — Videolar (siz) → Supabase Storage → ulash.
## W6 — Gamification: XP, badge, milestone, education darslari, fitness-test tarixi.

**Ketma-ketlik:** W1 → W2 → W3 → W4 (W5 parallel siz, W6 keyin).
