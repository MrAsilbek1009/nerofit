# Phase 8 — Build & Backend hardening · Handoff

Branch: `phase-8-infra-hardening`

Bu fazada **build va backend mustahkamligi** qo'shildi: EAS environment
variables (standalone build serverga ulanishi uchun), AI Coach rate-limit
(API xarajatdan himoya), va Sentry crash reporting. Kod tayyor; quyida
**qo'lda bajariladigan** sozlamalar.

---

## Nima qilindi (kod, 🤖)

**AI Coach rate-limit**
- `supabase/functions/ai-coach/index.ts` — Anthropic chaqiruvidan **oldin**
  foydalanuvchining `chat_messages` (role=user) sonini RLS bilan sanab,
  limit oshsa `429` qaytaradi. Migration kerak emas.
  - Standart: **50 / 24 soat** + **6 / 60 sek** (burst).
  - Sozlanadi: `AI_DAILY_LIMIT`, `AI_BURST_LIMIT` (function secrets).
- `app/(tabs)/coach.tsx` — `429` aniqlanganda `coach.rateLimited` xabari.
  i18n kalitlari en/uz/ru.

**Sentry crash reporting**
- `@sentry/react-native ~7.11.0` + Expo config plugin (`app.json`).
- `src/lib/sentry.ts` — analytics/notifications kabi **lazy + DSN bilan
  himoyalangan**: DSN bo'lmasa to'liq no-op (Expo Go / eski build crash bo'lmaydi).
  `_layout.tsx`'da eng erta init + user identity + root `wrapApp`.
- `EXPO_PUBLIC_SENTRY_DSN` — `.env.example`'ga qo'shildi.

**EAS environment variables**
- `eas.json` — har bir build profiliga `environment` (development/preview/
  production) qo'shildi. Endi EAS server'dagi env o'zgaruvchilar build'ga
  avtomatik kiritiladi (hozir faqat lokal `.env` o'qilardi → standalone build
  serverga ulanmas edi).

---

## 🧑 Qo'lda bajariladigan qadamlar

### 1. EAS environment variables (eng muhim — busiz production build ishlamaydi)
`eas login` qiling (Expo akkaunt), so'ng har bir muhit uchun o'zgaruvchilarni
yarating. **Qiymatlar — `nerofit/.env` dagi bilan bir xil.**

```bash
cd ~/Nerofit/nerofit
eas login

# Production (preview/development uchun --environment ni almashtiring):
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL      --value "<.env dagi URL>"      --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<.env dagi anon key>" --visibility sensitive
# PostHog / Sentry (ixtiyoriy):
eas env:create --environment production --name EXPO_PUBLIC_POSTHOG_KEY       --value "<phc_...>"          --visibility sensitive
eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN        --value "<sentry dsn>"       --visibility plaintext
```
> Yoki bu o'zgaruvchilarni **Expo dashboard → Project → Environment variables** orqali qo'shing.
> Eng kamida `SUPABASE_URL` + `SUPABASE_ANON_KEY` har bir muhit uchun shart.

### 2. Sentry (xatolarni ko'rish uchun)
1. https://sentry.io da loyiha yarating (platforma: React Native) → **DSN** oling.
2. DSN'ni EAS env var qiling: `EXPO_PUBLIC_SENTRY_DSN` (yuqoridagi #1).
3. Lokal sinash uchun `nerofit/.env` ga ham qo'shing: `EXPO_PUBLIC_SENTRY_DSN=...`
4. **Dev build'ni qayta quring** (`npx expo run:ios`) — native modul yangi build'da paydo bo'ladi.
5. (Ixtiyoriy) O'qiladigan stack trace uchun source-map yuklash: `SENTRY_AUTH_TOKEN`
   ni EAS secret qiling + Sentry org/project sozlang.

### 3. AI Coach rate-limit (deploy)
Funksiya kodi yangilandi — aktiv bo'lishi uchun **deploy kerak**:
```bash
supabase functions deploy ai-coach --project-ref orhhiqdvukshlvtqorgp
```
(Ixtiyoriy limitni o'zgartirish: `supabase secrets set AI_DAILY_LIMIT=100 --project-ref orhhiqdvukshlvtqorgp`)

### 4. Supabase Pro (ixtiyoriy, ~$25/oy)
Free tier'da loyiha faolsizlikdan **pauza** bo'ladi va **backup yo'q**. Production
uchun Pro tavsiya etiladi (Supabase dashboard → Settings → Billing).

---

## DoD holati
- ✅ EAS env mexanizmi (kod) — env vars yaratilgach standalone build serverga ulanadi.
- ✅ AI Coach rate-limit (kod) — `ai-coach` deploy qilingach aktiv.
- ✅ Sentry (kod) — DSN + qayta build qilingach xatolar ko'rinadi.
- 🧑 Supabase Pro — ixtiyoriy upgrade.
