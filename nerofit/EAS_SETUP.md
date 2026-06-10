# EAS Build — sozlash (Android, dev build)

Native modullar (push, RevenueCat) **Expo Go**'da ishlamaydi — ular uchun
**development build** kerak. Quyidagi qadamlar bir martalik.

> Hammasi `nerofit/` papkasida bajariladi.

## 1. Expo akkaunti (bepul)
https://expo.dev → ro'yxatdan o'ting (email + parol). Bu EAS Build uchun majburiy.

## 2. EAS'ga kirish
```powershell
npx eas-cli login
```
Email + parolingizni kiriting.

## 3. Loyihani EAS'ga ulash
```powershell
npx eas-cli init
```
- Bu `app.json` ga `extra.eas.projectId` qo'shadi (push token uchun ham kerak).
- So'ngra o'sha o'zgargan `app.json` ni commit qiling:
  `git add app.json && git commit -m "chore: add EAS projectId"`

## 4. Android dev build (bulutda)
```powershell
npx eas-cli build --profile development --platform android
```
- Birinchi marta EAS **Android keystore** yaratishni so'raydi → **Yes**.
- Bulutda ~10–20 daqiqa quriladi. Tugagach **APK** havolasi/QR beradi.

## 5. APK'ni telefonga o'rnatish
- Havoladan APK'ni Android telefoningizga yuklab oling.
- O'rnating ("noma'lum manbalar"ga ruxsat berishingiz kerak bo'lishi mumkin).
- Bu — Expo Go o'rniga ishlaydigan sizning **dev build**ingiz.

## 6. Dev serverni ishga tushirish
```powershell
npx expo start --dev-client
```
- Telefonda **dev build** ilovasini oching (Expo Go emas) va QR'ni skanerlang.
- Endi native modullar (keyingi qadamlarda push/RevenueCat) ishlaydi.

## Profil izohi (eas.json)
- `development` — dev client, ichki tarqatish, **APK** (oson o'rnatish).
- `preview` — ichki test uchun APK.
- `production` — Play Store uchun **AAB** (app-bundle), versiya avtomatik oshadi.

## 7. EAS Update (OTA) — JS'ni build'siz yuborish
`expo-updates` qo'shildi. Bu JS/asset o'zgarishlarini do'kon yoki yangi
build'siz telefonga yuborishga imkon beradi. `app.json` da `updates.url` va
`runtimeVersion` (fingerprint) allaqachon sozlangan; `eas.json` profillariga
`channel` qo'shildi.

> ⚠️ **Muhim:** `expo-updates` **va** `expo-notifications` yangi native
> modullar. Ikkalasi ishlashi uchun **dev client'ni bir marta qayta build
> qiling** (bitta rebuild ikkalasini qamraydi):
> `npx eas-cli build --profile development --platform android`
> Eski build'da OTA ham, bildirishnomalar ham ishlamaydi.

OTA yangilanish yuborish:
```powershell
npx eas-cli update --branch preview --message "Nima o'zgardi"
```
- `--branch` build profilidagi `channel` bilan mos bo'lishi kerak
  (development / preview / production).
- production build'lar `production` kanalidan yangilanish oladi.

> Faol development paytida OTA shart emas — `npx expo start --dev-client`
> (Metro) o'zgarishni darrov ko'rsatadi. OTA preview/production build'lar uchun.

## 8. Analytics (PostHog)

Provider = **PostHog** (`posthog-react-native`). Native kontekst uchun
`expo-device`, `expo-application`, `expo-file-system` qo'shildi (yangi native
modullar → rebuild kerak). Config plugin SHART EMAS.

Kod qatlami: `src/lib/analytics.ts` — `notifications.ts` kabi lazy-load + kalit
yoki native modul bo'lmasa **no-op** (Expo Go / eski build'da yiqilmaydi).
Hodisalar `_layout.tsx` (init, identify/reset, ekran ko'rinishlari) va
mutation'larda (`onboarding_completed`, `workout_completed`, `exercise_logged`,
`meal_logged`, `supplement_toggled`, `water_logged`, `coach_message_sent`,
`reminders_enabled/disabled`) ulangan.

Kalitni sozlash (bir martalik):
1. https://posthog.com → bepul akkaunt → loyiha yarating.
2. Project Settings'dan **Project API Key** (`phc_…`) ni oling. Bu PUBLIC kalit
   (anon key kabi), ilovaga joylash xavfsiz.
3. `nerofit/.env` ga qo'shing (`.env.example` da namuna bor):
   ```
   EXPO_PUBLIC_POSTHOG_KEY=phc_...
   EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```
   (EU loyiha bo'lsa host = `https://eu.i.posthog.com`.)
> Kalit bo'lmasa analytics o'chiq turadi — xato bermaydi.

## 9. Notifications + Analytics — birgalikda rebuild

`expo-notifications`, `expo-updates` **va** yangi analytics native modullari
(`expo-device/application/file-system`) bitta dev build'da qamraladi.
`runtimeVersion` "fingerprint" bo'lgani uchun bu o'zgarishlar OTA bilan emas,
faqat yangi build bilan yetadi:

```powershell
npx eas-cli build --profile development --platform android
```
Build tugagach APK'ni o'rnatib, `npx expo start --dev-client` bilan sinang.

## Keyingi qadamlar
1. ✅ **Push (eslatmalar)** — ulangan (Profile toggle).
2. ✅ **Analytics** — PostHog ulangan (yuqoridagi 8-bo'lim). Kalitni `.env` ga
   qo'ying va 9-bo'limdagi rebuild'ni bajaring.
3. **RevenueCat** (eng oxirida) — boshlashdan oldin alohida so'rayman.

> JS-only o'zgarishlarni hali ham `npx expo start` (Expo Go) bilan tez sinash
> mumkin; dev build faqat native modullarni sinash uchun kerak.
