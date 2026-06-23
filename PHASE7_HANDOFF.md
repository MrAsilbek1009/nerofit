# Phase 7 — Auth & Account · Handoff

Branch: `phase-7-auth-account`

Bu fazada **Auth & Account to'liqligi** qo'shildi: parolni tiklash, hisobni
o'chirish (App Store majburiy), email tasdiqlash UI holatlari va Apple stub'ni
olib tashlash. Kod tayyor; quyida **qo'lda bajariladigan** sozlamalar (🧑) va
deploy qadamlari ko'rsatilgan.

---

## Nima qilindi (kod, 🤖)

**Parolni tiklash (forgot/reset password)**
- `app/(auth)/forgot-password.tsx` — email kiritib, `resetPasswordForEmail`
  chaqiradi. Redirect: `nerofit://reset-password` (deep link).
- `app/(auth)/reset-password.tsx` — deep link orqali recovery sessiyasi
  o'rnatilgach yangi parol formasi (`updateUser({ password })`).
- `src/features/auth/recovery.ts` — kiruvchi deep link'dan token'larni ajratib,
  recovery sessiyasini o'rnatadi (implicit `access_token`/`refresh_token` +
  `token_hash` fallback). Root layout'da `initRecoveryLinking()` bilan ulandi.
- `src/store/auth.ts` — `passwordRecovery` bayrog'i. AuthGate shu bayroq yoqilganda
  foydalanuvchini reset-password ekranida ushlab turadi (ilovaga kiritmaydi).
- Login ekranida "Parolni unutdingizmi?" havolasi.

**Hisobni o'chirish (account deletion)**
- `supabase/functions/delete-account/index.ts` — JWT'ni tekshiradi, so'ng
  service-role bilan `auth.admin.deleteUser()`. **Barcha user jadvallari
  `auth.users` ga `ON DELETE CASCADE` bilan bog'langan**, shuning uchun bitta
  delete butun ma'lumotni (profil, goals, body_metrics, sessions, exercise_logs,
  chat, meal/supplement/water/health logs) o'chiradi. **Migration shart emas.**
- `src/lib/api/account.ts` + `src/lib/queries/account.ts` — `useDeleteAccount`.
- `app/delete-account.tsx` — nima o'chishini ko'rsatuvchi tasdiq ekrani +
  yakuniy native Alert. Muvaffaqiyatda lokal sign-out + cache tozalash.
- Profile'da "Hisobni o'chirish" qatori.

**Boshqa**
- Apple Sign In stub tugmasi login'dan olib tashlandi (boshqa 3rd-party login
  yo'q → Apple talab qilinmaydi; ishlamaydigan "Coming soon" tugma do'kon
  rad etishiga sabab bo'lishi mumkin edi). Tegishli i18n kalitlari o'chirildi.
- i18n: `en/uz/ru` uchchalasiga yangi kalitlar.
- `colors.danger` (#FF6B6B) tokeni qo'shildi (logout endi hardcode emas).

---

## 🧑 Qo'lda bajariladigan qadamlar (Supabase Dashboard)

1. **Redirect URL allowlist** — Authentication → URL Configuration →
   *Redirect URLs* ga qo'shing:
   - `nerofit://reset-password`
   - (Expo Go bilan dev test uchun, kerak bo'lsa) `exp://*` yoki ko'rsatilgan exp URL.
   Bu bo'lmasa parolni tiklash havolasi rad etiladi.

2. **Email tasdiqlash (email verification)** — Authentication → Providers →
   Email → *Confirm email* ni **yoqing**. Ilovadagi UI holatlari (signup'dan
   keyin "Emailni tekshiring" xabari) allaqachon tayyor.

3. **Email shablonlari (ixtiyoriy, lekin tavsiya)** — Authentication → Email
   Templates → *Reset Password* va *Confirm signup* matnlarini brendlang.
   Standart implicit havola token'larni fragment'da yuboradi — ilova shuni
   o'qiydi, o'zgartirish shart emas.

## 🧑/🤖 Deploy qadamlari (Supabase CLI)

```bash
# Edge Function'ni deploy qilish (lokal Supabase CLI bilan):
supabase functions deploy delete-account
```
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` Edge Function
  runtime'da **avtomatik** mavjud — qo'shimcha secret kerak emas.

---

## Sinash (QA)

**Parolni tiklash:**
1. Login → "Parolni unutdingizmi?" → email kiriting → "Havola yuborish".
2. Pochtadagi havolani **qurilmada** oching → ilova `reset-password` ekranini ochadi.
3. Yangi parol kiriting → "Parolni yangilash" → "Kirishga qaytish" → yangi parol bilan kiring.
   - Eslatma: deep link'ni qurilmada (emulator/real) ochish kerak; brauzerda emas.

**Hisobni o'chirish:**
1. `delete-account` funksiyasi deploy qilingan bo'lishi shart.
2. Profile → "Hisobni o'chirish" → tasdiq ekrani → "Hisobni o'chirish" → Alert → tasdiqlang.
3. Login ekraniga qaytadi; o'sha akkaunt bilan qayta kira olmaysiz; barcha ma'lumot o'chgan.

---

## DoD holati
- ✅ Parolni tiklash oqimi (kod) — dashboard redirect URL qo'shilgach ishlaydi.
- ✅ Hisobni o'chirish — funksiya deploy qilingach barcha ma'lumotni o'chiradi.
- ✅ Email verification UI holatlari — dashboard toggle 🧑 qoldi.
- ✅ Apple stub olib tashlandi.
