# Phase 5 (AI Coach) — Handoff / Topshiriq hujjati

**Sana:** 2026-06-08
**Branch:** `phase-5-ai-coach` (main'ga HALI merge qilinmagan)
**Holat:** ✅ Qurildi va ishlayapti (web'da tasdiqlangan)

Bu hujjat bugun qilingan barcha o'zgarishlarni tushuntiradi, toki loyiha boshqa
kompyuterda aniq davom ettirilsin.

---

## 1. Umumiy xulosa (o'zbekcha)

Bugun NeroFit loyihasiga **Phase 5 — AI Coach** qo'shildi. Bu "Forge" deb
nomlangan AI murabbiy bo'lib, foydalanuvchining profili (maqsad, jihozlar,
jarohatlar) asosida shaxsiylashtirilgan javoblar beradi. Chat ekrani, Supabase
Edge Function (Claude API'ga ulanadi) va ma'lumotlar bazasi jadvallari yaratildi.

Yo'l-yo'lakay bitta jiddiy muammo (`INVALID_CREDENTIALS`) hal qilindi — pastda
batafsil yozilgan, chunki bu muammo qaytalanishi mumkin.

---

## 2. Kodga qo'shilgan / o'zgartirilgan fayllar

### Yangi fayllar
| Fayl | Vazifasi |
|---|---|
| `nerofit/app/(tabs)/coach.tsx` | AI Coach chat ekrani (Placeholder o'rniga to'liq UI) |
| `nerofit/src/features/coach/components/ChatBubble.tsx` | Chat xabar pufakchasi |
| `nerofit/src/features/coach/components/ChatInput.tsx` | Xabar yozish maydoni |
| `nerofit/src/features/coach/components/SuggestionChips.tsx` | Tayyor savol tugmalari |
| `nerofit/src/features/coach/components/WorkoutEmbed.tsx` | Javobda mashq kartasi |
| `nerofit/src/lib/api/chat.ts` | Edge Function'ga so'rov yuborish (API qatlami) |
| `nerofit/src/lib/queries/chat.ts` | TanStack Query hook'lari (thread + xabar yuborish) |
| `nerofit/supabase/functions/ai-coach/index.ts` | Edge Function — Claude'ga ulanadi |
| `nerofit/supabase/migrations/0007_chat.sql` | chat_threads / chat_messages jadvallari + RLS |

### O'zgartirilgan fayllar
| Fayl | O'zgarish |
|---|---|
| `nerofit/src/lib/queries/keys.ts` | chat query kalitlari qo'shildi |
| `nerofit/src/types/db.ts` | chat_threads / chat_messages tiplari |
| `nerofit/src/i18n/locales/{en,uz,ru}.json` | Coach uchun matnlar (3 til) |
| `nerofit/.gitignore` | `supabase/.temp/` qo'shildi |

---

## 3. Supabase (server tomonidagi) o'zgarishlar

Bular GitHub'da EMAS — to'g'ridan-to'g'ri Supabase loyihasida bajarilgan
(project ref: `orhhiqdvukshlvtqorgp`). Boshqa kompyuterda qayta qilish SHART EMAS,
chunki ular serverda saqlanadi va barcha kompyuterlar uchun umumiy.

1. **SQL migration 0007** — SQL Editor orqali ishga tushirildi:
   `chat_threads` va `chat_messages` jadvallari + RLS policy'lar yaratildi.

2. **Edge Function `ai-coach`** — deploy qilindi (Claude API'ga ulanadi).

3. **Secret qo'shildi:** `ANTHROPIC_API_KEY` (Edge Functions → Secrets).
   ⚠️ Bu kalit faqat Supabase dashboard'da. Agar Forge "LLM error" bersa,
   kalit yoki billing/credit'ni tekshiring.

4. **⚠️ ENG MUHIM — `verify_jwt` o'chirildi (CLI orqali).**

---

## 4. ⚠️ Muhim muammo va yechim: INVALID_CREDENTIALS

**Belgisi:** App'da "Failed to send", Supabase loglarida har bir so'rov
`401 {"message":"Invalid credentials","code":"INVALID_CREDENTIALS"}` qaytaradi.

**Aniqlangan sabab (fakt bilan):** Supabase Edge Function'lar default holda
"Verify JWT" yoqilgan holda yaratiladi. Bu gateway qatlami so'rovni funksiya
kodiga yetkazmasdan rad etardi (hatto to'g'ri anon key bilan ham). Tekshiruv:
- REST API o'sha anon key bilan → HTTP 200 ✅
- Edge Function o'sha anon key bilan → HTTP 401 INVALID_CREDENTIALS ❌

**Dashboard'dagi "Verify JWT" toggle bu loyihada ISHLAMADI** (toggle + redeploy
ham yordam bermadi). Yagona ishlagan yechim — CLI orqali deploy:

```powershell
cd <loyiha>/nerofit
npx supabase login
npx supabase functions deploy ai-coach --no-verify-jwt --project-ref orhhiqdvukshlvtqorgp
```

Bu xavfsiz: funksiya KOD ICHIDA `getUser()` orqali foydalanuvchini baribir
tekshiradi. Faqat ortiqcha gateway qatlami olib tashlanadi.

**Eslatma:** Agar kelajakda funksiyani oddiy `npx supabase functions deploy
ai-coach` (--no-verify-jwt SIZ) bilan qayta deploy qilsangiz, muammo QAYTADI.
Har doim `--no-verify-jwt` bilan deploy qiling.

---

## 5. Boshqa kichik tuzatishlar (chat.ts)

- Web'da `functions.invoke` foydalanuvchi tokenini avtomatik qo'shmagani uchun,
  `getSession()` orqali access_token olib, qo'lda `Authorization` header qo'shildi.
- Xato javoblardagi haqiqiy sababni ko'rsatish uchun `FunctionsHttpError`
  ichidagi response body ochiladi.

---

## 6. Boshqa kompyuterda davom ettirish (qadamlar)

```powershell
# 1. Yangi branch'ni olish
git fetch origin
git checkout phase-5-ai-coach
git pull

# 2. .env faylini tekshirish (push QILINMAYDI — gitignore'da)
#    nerofit/.env ichida quyidagilar bo'lishi kerak:
#    EXPO_PUBLIC_SUPABASE_URL=https://orhhiqdvukshlvtqorgp.supabase.co
#    EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>

# 3. Paketlar (yangi paket yo'q, lekin node_modules eski bo'lsa)
cd nerofit
npm install

# 4. Ishga tushirish
npx expo start --web      # web uchun
# yoki
npx expo start            # QR kod orqali telefon (Expo Go)
```

Test: **Coach** tabiga o'tib, Forge'ga biror narsa yozing. Javob kelishi kerak.

---

## 7. Qolgan ishlar

- [ ] Phase 5'ni boshqa kompyuterda test qilish
- [ ] Tasdiqlangach: `phase-5-ai-coach` → `main` ga merge qilish
- [ ] Phase 6: RevenueCat (to'lov), push notifications, analytics

---

## 8. Branch'dagi commit'lar

```
0928931  chore: gitignore supabase cli temp files
b1022c1  Phase 5: harden ai-coach Edge Function + client error handling
5e2e001  Phase 5: AI Coach (chat UI + ai-coach Edge Function)
```
