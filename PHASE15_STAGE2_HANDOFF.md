# Phase 15 — Gym Membership · Bosqich 2 (Payme + Click) — Handoff

**Holat:** 🟡 Kod tayyor (scaffold). Live ishlashi uchun quyidagi qo'lda qadamlar
kerak (merchant akkauntlar hali yo'q). Bosqich 1 (qo'lda faollashtirish) o'zgarmadi.

Bu bosqichda ilova → to'lov → a'zolik **avtomatik** faollashadigan oqim qurildi:

```
Ilova "To'lash" (Payme|Click chip tanlanadi)
  → Edge Function `membership-checkout` (JWT bilan)
      pending membership + created payment yaratadi, checkout URL qaytaradi
  → ilova URL'ni ochadi (Linking.openURL) → foydalanuvchi to'laydi
  → provayder → Edge Function `payments-webhook?provider=payme|click`
      imzo/summa tekshiruv (idempotent: provider_txn) → payment=paid + membership=active
  → ilova (a'zolik ekrani) focus'da refetch qiladi → QR ko'rinadi
```

Project ref: `orhhiqdvukshlvtqorgp` (kerak bo'lsa o'zingiznikiga almashtiring).

---

## Kod (bu bosqichda qo'shildi)

- **Migration** `nerofit/supabase/migrations/0016_payment_provider_state.sql`
  — `payments` jadvaliga Payme uchun holat/vaqt ustunlari (`provider_state`,
  `create_time`, `perform_time`, `cancel_time`, `cancel_reason`) + `(provider,
  provider_txn)` indeks.
- **Edge Function** `nerofit/supabase/functions/membership-checkout/index.ts`
  — JWT tekshiradi, order yaratadi, Payme/Click checkout URL qaytaradi.
- **Edge Function** `nerofit/supabase/functions/payments-webhook/index.ts`
  — `?provider=payme` (JSON-RPC 2.0: CheckPerform/Create/Perform/Cancel/Check/
  GetStatement, Basic-Auth) va `?provider=click` (Prepare/Complete, MD5 imzo).
- **Ilova:** `src/lib/api/membership.ts` → `startCheckout()`;
  `src/lib/queries/membership.ts` → `useStartCheckout()`;
  `app/(tabs)/membership.tsx` → Payme/Click tanlovi (chip) + real "To'lash" tugma;
  i18n `en/uz/ru` (`membership.pay`, `providerLabel`, `checkoutError*`).
- `src/types/db.ts` — `Payment` tipi qo'lda yangilandi (0016 ustunlari).
  ⚠️ Migration qo'llanilgach `supabase gen types` bilan qayta generatsiya qiling.

---

## Sizning qadamlaringiz (deploy)

### 1. Migration'ni qo'llang
```bash
cd nerofit
npx supabase db push            # yoki dashboard SQL editor'da 0016_*.sql
npx supabase gen types typescript --project-id orhhiqdvukshlvtqorgp > src/types/db.ts
```

### 2. Merchant akkauntlar (qo'lda oling)
- **Payme (Paycom) merchant/kassa** → `PAYME_MERCHANT_ID` + Merchant API **KEY**.
- **Click merchant** → `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`.
- Payme kassa sozlamalarida **account (order) maydoni = `order_id`** qilib
  belgilang (kod URL'da `ac.order_id=<payment.id>` yuboradi).

### 3. Secret'larni o'rnating (faqat Edge Functions'da, git'da EMAS)
```bash
npx supabase secrets set \
  PAYME_MERCHANT_ID=<kassa_id> \
  PAYME_MERCHANT_KEY=<merchant_api_key> \
  CLICK_SERVICE_ID=<service_id> \
  CLICK_MERCHANT_ID=<merchant_id> \
  CLICK_SECRET_KEY=<secret_key> \
  --project-ref orhhiqdvukshlvtqorgp
# ixtiyoriy: MEMBERSHIP_RETURN_URL (default nerofit://membership),
#            PAYME_CHECKOUT_URL (default https://checkout.paycom.uz/)
```

### 4. Funksiyalarni deploy qiling
`membership-checkout` — JWT **kerak** (default):
```bash
npx supabase functions deploy membership-checkout --project-ref orhhiqdvukshlvtqorgp
```
`payments-webhook` — provayder chaqiradi, JWT **yo'q** → `--no-verify-jwt`
(Phase 5/13'dagi kabi; dashboard toggle ishonchsiz, faqat CLI flag ishlaydi):
```bash
npx supabase functions deploy payments-webhook --no-verify-jwt --project-ref orhhiqdvukshlvtqorgp
```

### 5. Webhook URL'larini provayder kabinetida ro'yxatdan o'tkazing
```
Payme:  https://orhhiqdvukshlvtqorgp.functions.supabase.co/payments-webhook?provider=payme
Click:  https://orhhiqdvukshlvtqorgp.functions.supabase.co/payments-webhook?provider=click
```

---

## Bosqich 3 — Admin QR tekshirish paneli (deployed ✅)

Zal xodimi uchun ikki qismдан iborat:
- **JSON API** — `admin-verify` Edge Function (`nerofit/supabase/functions/admin-verify/index.ts`).
  POST actions: `verify` / `activate` / `plans`, hammasi `password` talab qiladi.
- **Sahifa (UI)** — `docs/gym-panel/index.html`, **GitHub Pages**'да joylashadi
  (parol + QR skaner/`user_id` → faol/emas + qo'лда faollashtirish).

> ⚠️ **Nega Edge Function o'zi HTML bermaydi?** Supabase funksiya domeni
> (`*.functions.supabase.co`) javobни majburan `text/plain` + `sandbox` CSP
> qiladi (phishing'нинг oldини olish) — HTML render bo'lmaydi, skript ishlamaydi.
> Shuning uchun UI Pages'да, funksiya faqat JSON API. Funksiya CORS ochiq.

Parol — yagona himoya chegarasi (funksiya service-role bilan RLS'ни chetlab
o'tadi), shuning uchun kuchli parol qo'ying.

**Holat (2026-07-02 da bajarildi):**
- ✅ `ADMIN_PANEL_PASSWORD` secret o'rnatilди (dashboard)
- ✅ `admin-verify` deploy qilinди (`--no-verify-jwt`)
- ✅ **GitHub Pages** yoqилди (source: hozir `phase-15-stage2-payments` /docs;
  PR merge'дан keyin `main` /docs ga o'tkaziladi — URL o'zгармайди) → panel URL:
  `https://mrasilbek1009.github.io/nerofit/gym-panel/`

Qayta deploy kerak bo'lса:
```bash
npx supabase functions deploy admin-verify --no-verify-jwt --project-ref orhhiqdvukshlvtqorgp
```
Sahifани o'zгартирса — `docs/gym-panel/index.html` ni tahrirlab, `main`'ga push
qiling (Pages avtomatik qayta quradi).

---

## Sinash (sandbox)
1. Payme/Click **sandbox** kalitlari bilan 3-qadamni bajaring.
2. Ilovada A'zolik tab → provayder tanlang → tarifda "To'lash" → checkout ochiladi.
3. Sandbox'da to'lovni yakunlang → ilovaga qaytib, ekran focus'da a'zolik **active**
   bo'lib QR chiqishi kerak.
4. Payme uchun sandbox tester barcha metodlarni (CheckPerform → Create → Perform →
   Cancel) yuboradi; barchasi 200 + to'g'ri `result`/`error` qaytishi kerak.

---

## Ma'lum cheklovlar / keyingi ish (Bosqich 3)
- **Merchant akkauntsiz sinab bo'lmaydi** — hozircha faqat scaffold. Bosqich 1
  qo'lda faollashtirish (SQL/admin) hamon ishlaydi.
- To'lanmagan checkout'lar `pending` membership + `created` payment qoldiradi
  (zararsiz — `getActiveMembership` `active`ni ustun qo'yadi). Keyin eskirgan
  pending'larni tozalash `cron`i qo'shsa bo'ladi.
- Eslatma (muddat tugashi), freeze, admin web-panel — **Bosqich 3**.
- `payments-webhook` bitta funksiya, `?provider=` bo'yicha yo'naltiradi
  (rejadagi `payments-webhook` nomi saqlangan).
