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

> ⚠️ **Muhim:** `expo-updates` yangi native modul. OTA ishlashi uchun **dev
> client'ni bir marta qayta build qiling**:
> `npx eas-cli build --profile development --platform android`
> Eski build'da (expo-updates'siz) OTA ishlamaydi.

OTA yangilanish yuborish:
```powershell
npx eas-cli update --branch preview --message "Nima o'zgardi"
```
- `--branch` build profilidagi `channel` bilan mos bo'lishi kerak
  (development / preview / production).
- production build'lar `production` kanalidan yangilanish oladi.

> Faol development paytida OTA shart emas — `npx expo start --dev-client`
> (Metro) o'zgarishni darrov ko'rsatadi. OTA preview/production build'lar uchun.

## Keyingi qadamlar (dev build tayyor bo'lgach)
1. **Push (eslatmalar)** — `expo-notifications` bilan suv/mashg'ulot/qo'shimcha
   eslatmalari. Profile'dagi Notification toggle'ni real qilamiz.
2. **Analytics** — provider tanlaymiz (PostHog/Amplitude) + hodisalarni ulaymiz.
3. **RevenueCat** (eng oxirida) — boshlashdan oldin alohida so'rayman.

> JS-only o'zgarishlarni hali ham `npx expo start` (Expo Go) bilan tez sinash
> mumkin; dev build faqat native modullarni sinash uchun kerak.
