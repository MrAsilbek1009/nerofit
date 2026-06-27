# Phase 12 — iOS + Release · Handoff

Branch: `phase-12-ios-release`

Bu faza ilovani **ikkala do'konga (Play + App Store) chiqarishga** tayyorlaydi.
Kod tomonida qiladiganimiz oz qoldi (notifications polish ✅); asosiy ish —
**dashboard / akkaunt sozlamalari** (RevenueCat, Sentry, Apple, Google), ular
faqat sizning akkauntlaringizdan bajariladi. Quyida har biri raqamli qadam bilan.

---

## Nima qilindi (kod, 🤖)

**Android bildirishnoma (notifications) polish**
- `app.json` → `expo-notifications` config plugin qo'shildi:
  - `icon`: `./assets/android-icon-monochrome.png` (oq siluet — Android kichik
    bildirishnoma ikonkasi shaffof alfa'dan yasaladi; ilgari ikonkasiz oq
    kvadrat ko'rinardi).
  - `color`: `#D4E924` (chartreuse accent).
- Reminder kanali (`reminders`) allaqachon `src/lib/notifications.ts`'da runtime'da
  yaratiladi. **Ikonka faqat yangi native build'da ko'rinadi** (pastdagi #5).

> ⚠️ Bu o'zgarish `app.json`ni o'zgartirgani uchun **native qayta build** talab
> qiladi (`eas build` yoki `npx expo run:android`).

---

## 1. 🧑 RevenueCat dashboard sozlash (obuna)

Kod tayyor (`src/lib/purchases.ts`, entitlement nomi **aynan `elite`**). Faqat
quyidagilarni dashboard'da qiling:

1. **Akkaunt/loyiha** — https://app.revenuecat.com → yangi project (nomi: Nerofit).
2. **App qo'shish** — Project → Apps:
   - Android: package `com.nerofit.app` + Google Play Service Account credentials
     (Play Console'dan, pastdagi #4'da).
   - iOS: bundle `com.nerofit.app` + App Store shared secret (Apple akkaunt bo'lgach, #5).
3. **Mahsulot (product)** — do'kon konsolida obuna mahsulotlarini yarating
   (masalan `nerofit_monthly`, `nerofit_yearly`), keyin RevenueCat'da import qiling.
4. **Entitlement** — RevenueCat → Entitlements → **`elite`** (aynan shu nom) yarating
   → mahsulotlarni unga biriktiring.
5. **Offering** — Offerings → `default` (current) → paketlar (Monthly/Annual) qo'shing.
6. **API kalitlar** — Project → API keys (platforma bo'yicha publishable key):
   - Lokal sinash: `nerofit/.env` →
     `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
   - Production: EAS env var (#3).
7. **Sinash** — sandbox/test obuna sotib oling → paywall "siz Elite'dasiz" +
   Profile badge "Elite" bo'lishi kerak.

> Eslatma: hozir hech bir funksiya gate qilinmagan (qaror). Premium funksiya
> tanlasangiz: `const isElite = useIsElite(); if (!isElite) router.push("/paywall")`.

---

## 2. 🧑 Sentry dashboard sozlash (xato kuzatuvi)

Kod tayyor (`src/lib/sentry.ts`, DSN bo'lmasa no-op). Qadamlar:

1. https://sentry.io → yangi project, platforma **React Native** → **DSN** oling.
2. DSN'ni qo'ying:
   - Lokal: `nerofit/.env` → `EXPO_PUBLIC_SENTRY_DSN=https://...`
   - Production: EAS env var (#3).
3. (Ixtiyoriy, o'qiladigan stack trace) source-map yuklash uchun
   `SENTRY_AUTH_TOKEN`ni **EAS secret** qiling + Sentry org/project sozlang.
4. **Native qayta build** (#5) — Sentry native modul yangi build'da paydo bo'ladi.
5. Sinash: ilovada ataylab xato chiqaring → Sentry "Issues"'da ko'rinishi kerak.

---

## 3. 🧑 EAS environment variables (production build uchun shart)

Standalone build lokal `.env`ni o'qimaydi — qiymatlar EAS serverda bo'lishi kerak.
`eas login` qiling, so'ng har bir muhit (production/preview) uchun:

```bash
cd nerofit
eas login
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL      --value "<.env URL>"      --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<.env anon key>" --visibility sensitive
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "<rc android key>" --visibility sensitive
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY     --value "<rc ios key>"     --visibility sensitive
eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN         --value "<sentry dsn>"   --visibility plaintext
# (ixtiyoriy) EXPO_PUBLIC_POSTHOG_KEY / EXPO_PUBLIC_POSTHOG_HOST
```
> Yoki Expo dashboard → Project → Environment variables. Eng kamida
> `SUPABASE_URL` + `SUPABASE_ANON_KEY` har bir muhit uchun shart.

---

## 4. 🧑 Google Play (Android — Apple akkauntsiz ham boshlash mumkin)

1. **Play Console** akkaunt ($25 bir martalik) → yangi ilova `com.nerofit.app`.
2. **Service account** (RevenueCat + `eas submit` uchun): Play Console → API access
   → Service account yarating → JSON kalitni yuklab oling.
3. Production build:
   ```bash
   cd nerofit
   eas build --platform android --profile production
   ```
4. **Internal testing** — `.aab`ni Play Console → Internal testing'ga yuklang,
   tester sifatida o'zingizni qo'shing, real qurilmada QA qiling.
5. `eas submit` config (`eas.json`'da `submit.production` hozir bo'sh —
   EAS interaktiv so'raydi yoki to'ldiring):
   ```json
   "submit": {
     "production": {
       "android": {
         "serviceAccountKeyPath": "./play-service-account.json",
         "track": "internal"
       }
     }
   }
   ```
   > `play-service-account.json` ni **git'ga qo'ymang** (`.gitignore`).

---

## 5. 🧑 Apple / iOS ($99/yil — Apple Developer kerak)

1. **Apple Developer Program** ro'yxatdan o'ting ($99/yil).
2. **App Store Connect** → yangi ilova, bundle `com.nerofit.app`, **ascAppId** (raqam)
   va **appleTeamId** ni eslab qoling.
3. iOS build (kredentsiallarni EAS interaktiv yaratadi):
   ```bash
   cd nerofit
   eas build --platform ios --profile production
   ```
4. **TestFlight** — build avtomatik TestFlight'ga tushadi (yoki `eas submit`),
   real iPhone'da QA.
5. `eas.json` → `submit.production.ios`:
   ```json
   "ios": {
     "appleId": "<apple-id email>",
     "ascAppId": "<App Store Connect app id>",
     "appleTeamId": "<team id>"
   }
   ```
6. App Store sahifasi: tavsif (Phase 11 matnlari), skrinshotlar, App Privacy formasi
   (PostHog/Supabase/Sentry — `store/data-safety.md` asosida).

---

## 6. 🧑+🤖 Yakuniy QA + submit

- [ ] Android internal + iOS TestFlight'da to'liq oqim sinovdan o'tdi
      (auth → onboarding → workout → nutrition → coach → paywall).
- [ ] Sentry'da xatolar ko'rinadi; RevenueCat sandbox obuna ishlaydi.
- [ ] Bildirishnoma ikonkasi to'g'ri (oq siluet, oq kvadrat emas).
- [ ] Store listing + maxfiylik formalari to'ldirilgan (Phase 11).
- Submit:
  ```bash
  eas submit --platform android --profile production
  eas submit --platform ios --profile production
  ```

**DoD:** ikkala do'konda review'ga yuborilgan.

---

## Tartib bo'yicha tavsiya
Apple akkaunti hali bo'lmasa: **avval Android'ni** to'liq chiqaring (#1 RC + #2
Sentry + #3 EAS env + #4 Play), Apple'ni ($99) keyin qo'shing (#5). Kod ikkalasiga
ham tayyor.
