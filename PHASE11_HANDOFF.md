# Phase 11 — Legal & Store listing · Handoff

Branch: `phase-11-legal-store`

Bu fazada **do'konga chiqish uchun huquqiy va listing materiallari** tayyorlandi:
Privacy Policy + Terms (GitHub Pages uchun HTML), ilovada havolalar, store listing
matni (en/uz/ru), va Data Safety / App Privacy deklaratsiyasi.

---

## Nima qilindi (kod/matn, 🤖)

- `docs/privacy-policy.html`, `docs/terms.html`, `docs/index.html` — GitHub Pages
  uchun tayyor HTML. Ilova yig'adigan real ma'lumotlarga (Supabase/Anthropic/
  PostHog/Sentry/RevenueCat) mos. Health disclaimer kiritilgan.
- Ilovada **Profile → Privacy Policy / Terms** qatorlari (`src/lib/legal.ts`
  dagi URL'larni ochadi). i18n en/uz/ru.
- `store/listing.md` — App Store + Play uchun nom/subtitle/tavsif/keyword (en/uz/ru).
- `store/data-safety.md` — Google Data Safety + Apple App Privacy formalarini
  to'ldirish uchun deklaratsiya.

---

## 🧑 Qo'lda bajariladigan qadamlar

### 1. Huquqiy matnlarni to'ldirish
`docs/privacy-policy.html` va `docs/terms.html` dagi **`[TO FILL]`** larni
to'ldiring: yuridik nom, **aloqa email**, kuchga kirish sanasi, governing-law
davlat. (Tavsiya: yuridik mutaxassis ko'rib chiqsa.)

### 2. GitHub Pages yoqish (privacy URL jonli bo'lishi uchun)
GitHub repo → **Settings → Pages** → Source: **Deploy from a branch** →
Branch: **main**, Folder: **/docs** → Save. Bir-ikki daqiqada quyidagilar jonli:
- `https://mrasilbek1009.github.io/nerofit/privacy-policy.html`
- `https://mrasilbek1009.github.io/nerofit/terms.html`

> ⚠️ Ilovadagi havolalar (`src/lib/legal.ts`) aynan shu URL'larga ishora qiladi.
> Pages boshqa manzil bersa — `legal.ts` ni yangilang.

### 3. Ilovada tekshirish
Profile → **Privacy Policy** / **Terms** bosilganda brauzerda ochilishi kerak
(Pages yoqilgandan keyin).

### 4. Store listing
`store/listing.md` dan matnlarni App Store Connect / Play Console ga ko'chiring
(nom, subtitle/qisqa tavsif, tavsif, keyword, kategoriya = Health & Fitness,
privacy URL).

### 5. Data Safety / App Privacy
`store/data-safety.md` bo'yicha **Google Play → Data safety** va
**App Store Connect → App Privacy** formalarini to'ldiring.

### 6. Skrinshot / feature graphic
Kerakli o'lchamlar:
- **App Store:** 6.7" iPhone — **1290×2796** (kamida 3 ta). (iPad ixtiyoriy.)
- **Google Play:** telefon skrinshot **1080×1920** (kamida 2 ta) + **feature
  graphic 1024×500**.
- Tavsiya: 5–6 asosiy ekran (Home, Workout, Player, Progress, Coach, Paywall),
  ustiga qisqa sarlavha. Skrinshotlarni dev build'dan oling (`xcrun simctl io booted screenshot`).

---

## DoD holati
- ✅ Privacy Policy + Terms (HTML) — `[TO FILL]` + Pages yoqilgach jonli.
- ✅ Ilovada privacy/terms havolalari (do'kon talabi).
- ✅ Store listing matni (en/uz/ru).
- ✅ Data Safety / App Privacy deklaratsiyasi.
- 🧑 Pages yoqish, formalarni to'ldirish, skrinshot.
