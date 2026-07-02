# Gym Membership (Zal abonementi) — Reja va Dizayn

**Holat:** ⬜ Reja (implementatsiya boshlanmagan)
**Maqsad:** Nerofit'ni zal-markazli qilish — jismoniy fitness zaliga a'zolik (abonement)
sotish, a'zolik holatini ko'rsatish, QR orqali kirish.

---

## 0. Muhim huquqiy asos (pul tejaydi)

Zal a'zoligi = **jismoniy xizmat**. Apple App Store va Google Play qoidalariga ko'ra
jismoniy tovar/xizmat uchun **in-app purchase (IAP) TALAB QILINMAYDI** — tashqi to'lov
(Payme/Click) ishlatiladi va do'konlar **30% komissiya olmaydi**.

➡️ Shuning uchun bu tizim **RevenueCat'siz** quriladi. RevenueCat faqat raqamli
premium kontent uchun kerak (masalan kelajakda workout track qaytsa).

---

## 1. Ma'lumotlar bazasi (Supabase)

```sql
-- Tariflar (admin boshqaradi). Ikki narx: app orqali olса CHEGIRMA, zalда to'liq.
membership_plans:
  id             uuid pk
  name_uz        text            -- "1 oylik", "3 oylik", "Yillik"
  duration_days  int             -- 30 / 90 / 365
  price_app_uzs  integer         -- ilova orqali (chegirmali)
  price_gym_uzs  integer         -- zalда to'liq narx (ko'rsatiladi: "zalда X")
  is_active      boolean
  sort_order     int

-- Belgilangan tariflar (seed):
--   1 oylik : app 250 000  | zal 350 000
--   3 oylik : app 750 000  | zal 1 050 000
--   Yillik  : app 1 250 000 | zal 1 500 000
-- Ilovaда app narx ko'rsatiladi + "zalда N so'm" (chegirmani ta'kidlash uchun).

-- Foydalanuvchi a'zoligi (bitta faol a'zolik + tarix)
memberships:
  id           uuid pk
  user_id      uuid → auth.users
  plan_id      uuid → membership_plans
  status       text            -- pending | active | expired | frozen | cancelled
  start_date   date
  end_date     date
  created_at   timestamptz

-- To'lov tarixi (Payme/Click yoki admin qo'lda)
payments:
  id            uuid pk
  user_id       uuid → auth.users
  membership_id uuid → memberships
  amount_uzs    integer
  provider      text            -- payme | click | manual
  provider_txn  text            -- provayder tranzaksiya id (idempotentlik uchun)
  status        text            -- created | paid | cancelled
  paid_at       timestamptz
```

**RLS:** foydalanuvchi faqat o'z `memberships`/`payments`ini ko'radi.
`membership_plans` — hammaga o'qishга ochiq (tariflar ro'yxati). Yozish — faqat admin
(service-role Edge Function).

**Faol a'zolik logikasi:** `status = 'active' AND end_date >= today`.

---

## 2. Ekranlar (dizayn)

Workout tab yashirilгani uchun uning o'rniga **"A'zolik" (Membership)** tab qo'yiladi
(yoki Profile ichida). Ekranlar:

1. **A'zolik holati** (asosiy)
   - Faol bo'lsa: tarif nomi, **tugash sanasi**, qolган kunlar, kata **QR kod**
   - Faol emas / muddati o'tган: "Abonement faol emas" + "Tarif tanlash" tugmasi
   - Muzlatilган (frozen): holat + qolган kunlar

2. **Tariflar (Plans)**
   - Kartalar: 1 oylik / 3 oylik / Yillik — narx (so'm) + tejamkorlik badge
   - "Tanlash va to'lash" → to'lov oqimi

3. **QR kod (kirish)**
   - `memberships.id` yoki imzolangan token → QR
   - Zal xodimi skaner qiladi → faol/emas ko'rsatiladi

4. **To'lov tarixi**
   - `payments` ro'yxati (sana, summa, tarif, provayder)

5. **(Admin, ixtiyoriy)** — a'zolikni qo'lда faollashtirish (MVP bosqich 1 uchun)

---

## 3. To'lov oqimi (Payme / Click)

Ikkala provayder ham **webhook**ga tayanadi — Supabase **Edge Function** merchant
endpoint bo'lib ishlaydi:

**Payme (JSON-RPC 2.0):**
```
CheckPerformTransaction  → buyurtma (payment) mavjud/summani tekshirish
CreateTransaction        → payments: status=created
PerformTransaction       → status=paid → membership: status=active, end_date hisoblanadi
CancelTransaction        → status=cancelled → membership qaytariladi
```

**Click:**
```
Prepare   → buyurtmani tekshirish + reserve
Complete  → to'lov tasdiqlash → membership faollashtirish
```

**Arxitektura:**
```
Ilova → "To'lash" (Payme/Click checkout link/SDK)
      → foydalanuvchi to'laydi
      → provayder webhook → Edge Function `payments-webhook`
      → imzo/summa tekshiruv (idempotent: provider_txn)
      → payments.status=paid + memberships faollashtirish
      → ilova a'zolik holatini refetch qiladi (yoki realtime)
```

**Xavfsizlik:** merchant kalitlar Edge Function **secret**larida (service-role bilan
`memberships` yoziladi; RLS chetlab o'tiladi faqat serverda).

---

## 4. QR orqali kirish nazorati

- A'zo ilovada QR ko'rsatadi (`membership.id` yoki qisqa imzolangan token).
- Zal xodimi skaner qiladi (oddiy telefon/skaner) → holat: **faol / muddati o'tган**.
- MVP: QR = membership id; zal tomoni web-sahifa yoki admin ilovada tekshiradi.

---

## 5. Bosqichlar (implementatsiya)

### Bosqich 1 — Poydevor + qo'lda faollashtirish (eng tez ishga tushadi)
- Migration: `membership_plans`, `memberships`, `payments` + RLS
- Seed: 3 tarif (1/3/12 oy)
- Ekranlar: A'zolik holati + Tariflar + QR + To'lov tarixi
- Admin qo'lда faollashtirish (zalда to'lov → admin a'zolik beradi) — Payme/Click'siz test
- **Natija:** to'liq oqim ishlaydi (to'lovдан tashqari), sinash mumkin

### Bosqich 2 — Payme/Click integratsiya — 🟡 kod tayyor (scaffold)
- ✅ Edge Function `payments-webhook` (Payme JSON-RPC + Click Prepare/Complete)
- ✅ Edge Function `membership-checkout` (order yaratadi + checkout URL)
- ✅ Ilovada "To'lash" tugmasi + Payme/Click tanlovi → checkout
- ✅ Idempotentlik (`provider_txn`) + imzo tekshiruv (Payme Basic-Auth, Click MD5)
- ✅ Migration `0016` (Payme holat/vaqt ustunlari)
- ⬜ **Sizdan:** merchant akkaunt + secret'lar + deploy + webhook URL ro'yxati +
  sandbox sinov → `PHASE15_STAGE2_HANDOFF.md`
- **Natija (deploy'dan keyin):** avtomatik to'lov → a'zolik faollashadi

### Bosqich 3 — Sayqal
- Muddat tugашига eslatма (push, 3 kun oldin)
- Freeze (muzlatish), tarif o'zgartirish
- Admin panel (tariflar, a'zolar, to'lovlar)

---

## 6. Qarorlar (belgilangan — 2026-07-01)
1. **Tariflar/narxlar:** 1/3/12 oy — app'да chegirma, zalда to'liq (yuqoriда seed).
2. **Provayder:** **Payme + Click** (ikkalasi). Arxitektura ko'p provayderli —
   kelajakda Uzum/Paynet qo'shish oson (`payments.provider` maydoni).
3. **QR kirish (admin):** **Web-panel** (MVP) — zal xodimi brauzерда QR skaner qiladi,
   a'zolik holatini ko'radi, qo'lда faollashtiradi. Keyin alohida admin ilova bo'lishi mumkin.
4. **A'zolik joyi:** **Alohida tab** (hozir yashirin Workout o'rniga). Workout
   qaytганда a'zolik tab qoladi, workout Home kartasi / qayta tab bo'ladi.

## 7. ⚠️ Workout track — vaqtincha yashirin (qaytadi)
Workout tab va Home dastur bloki **yashirilган** (gym-first). **Kelajakда qaytади.**
Batafsil: `WORKOUT_DEFERRED.md`. Yangi a'zolik tab shu bo'shliqни egallaydi.
