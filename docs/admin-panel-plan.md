# Admin Panel — Pro daraja reja (mustahkam boshqaruv tizimi)

> **Qaror:** Nerofit admin = zal biznesini **to'liq** boshqaradigan mustahkam
> panel — real-time nazorat, moliya, a'zolar, retention, xavfsizlik.
> **Dizayn:** Kinetic Editorial (true-black + chartreuse, minimal, gradient/glow yo'q).
> **Poydevor:** avval **xavfsizlik + audit** (A0), keyin xususiyatlar. Har bosqich
> mustaqil qiymat. Sana: 2026-07.

---

## 1. Vizyon
Bugungi panel = "qo'lda faollashtirish + xodim ro'yxati". Maqsad = **zal boshqaruv
tizimi (gym CRM)**: egasi bir qarashda biznesni ko'radi (daromad, a'zolar, kelish),
xavfsiz boshqaradi (rollar, audit), va a'zolarni ushlab qoladi (expiring/win-back).
"Bustahkam" = ishonchli auth + audit + validatsiya + pagination + tasdiq.

## 2. Hozirgi holat (audit)

**Panellar (Vercel, statik HTML → `admin-verify` Edge Function):**
- `docs/gym-panel` (xodim): QR verify · activate (naqd) · order scan · **freeze/unfreeze**.
- `docs/gym-admin` (admin): xodim CRUD · a'zo qidiruv (ism) → detail (to'lov + kelish) ·
  so'nggi kelishlar · admin parol.
- `docs/food-admin` (Mirolim, Phase 16): community taom verify.

**Backend `admin-verify` actions:** `session · plans · verify · activate ·
order_detail · order_activate · freeze · unfreeze · staff_list/add/set_password/
set_active/delete · admin_set_password · members_search · member_detail ·
checkins_recent`.

**Jadvallar:** `membership_plans · memberships · payments · gym_staff · gym_checkins`.

### Kamchiliklar (gap analysis)
| Yo'nalish | Hozir | Kerak (pro) |
|---|---|---|
| **Auth** | Har so'rovda **umumiy parol** yuboriladi | Sessiya token (qisqa muddat), parol bir marta |
| **Rollar** | admin / staff (qo'pol) | owner / admin / manager / staff — **granular ruxsat** |
| **Audit** | ❌ yo'q | Har amal loglanadi (kim/nima/qachon) |
| **Dashboard** | ❌ yo'q | KPI + trend (daromad, a'zo, kelish) |
| **A'zolar** | faqat ism qidiruv | To'liq ro'yxat + filtr (status/tarif/muddat) + amallar + eksport |
| **Moliya** | ❌ yo'q | To'lov jurnali, kunlik naqd hisoboti, daromad report, refund |
| **Tariflar** | faqat seed | Panelда yaratish/tahrir/o'chirish + chegirma |
| **Retention** | ❌ yo'q | Muddat tugayotgan / win-back ro'yxati + eslatma |
| **Barqarorlik** | pagination/validatsiya yo'q | Pagination, input-validatsiya, error holatlari, tasdiq |

## 3. Arxitektura qarori
- **Track A (tavsiya — hozir):** mavjud **vanilla HTML** panellarni saqlab,
  modullashtirib, A0–A5'ni qo'shamiz. Build yo'q, tez, Vercel'da.
- **Track B (kelajak):** hajm oshsa — **React (Vite) admin SPA** (boyroq jadval,
  chart, filtr). Jamoa React biladi. A6'da ko'rib chiqiladi.
- **Birlashtirish:** uzoq muddatда `gym-panel + gym-admin + food-admin` → bitta
  **rol-asosли admin** (xodim ko'radi kamроq, admin ko'proq). A0 auth shuni ochadi.

## 4. 🔒 A0 — Xavfsizlik poydevori (MUSTAHKAMLIK — BIRINCHI)
Bu bosqichsiz qolgani "qum ustiga qurilgan". Bir necha kun, lekin hamma narsani ko'taradi.

**Backend (`admin-verify` + migration `00XX-admin_security.sql`):**
- **Sessiya tokenlari** — `admin_sessions` (token hash, staff_id, role, expires_at).
  Login `{password}` → `{token}` qaytaradi (qisqa TTL, masalan 12 soat). Keyingi
  har so'rov `token` bilan (parol emas). Chiqиш = token o'chadi.
- **Rollar** — `gym_staff.role` kengaytmasi: `owner | admin | manager | staff`.
  Har action uchun **ruxsat matritsasi** (masalan `staff_delete` = owner/admin;
  `verify/activate` = hamma; `revenue_report` = owner/admin/manager).
- **Audit log** — `admin_audit` (actor_staff_id, action, target, meta jsonb,
  created_at). Har o'zgartiruvchi amal yoziladi. Admin ko'radiган **audit viewer**.
- **Rate limiting** — login urinishlari (brute-force himoya) + umumiy IP limit.
- **Validatsiya + pagination** — barcha ro'yxat action'lar `limit/offset`; input
  sanitatsiya; xatolarда aniq javob.
- **Tasdiq** — destructive amallar (o'chirish, refund) 2 qadamli.

**DoD:** parol faqat login'da; token bilan ishlaydi; har amal audit'да; rollar
tekshiriladi; ro'yxatlar sahifalangan.

## 5. Bosqichli reja (xususiyatlar)

### 🟩 A1 — Dashboard & KPI (real-time nazorat)
Egasi kirganда birinchi ko'radigan ekran.
- **KPI kartalar:** faol a'zolar · 7 kunда tugaydiganlar · muzlatilган · bugungi
  yangi a'zo · **bugungi/haftalik/oylik daromad** · bugungi kelishlar · peak soat.
- **Trend chartlar:** daromad (oy) · a'zo o'sishi · kelish (hafta kunlari / soatlar).
- Backend: `dashboard_stats` (memberships/payments/gym_checkins agregatsiya).
- Frontend: yangi "Dashboard" tab (KPI grid + minimal SVG chart, Kinetic Editorial).
- DoD: bitta so'rovда barcha KPI; chart to'g'ri; kesh (30-60s).

### 🟨 A2 — A'zolar boshqaruvi (pro)
- **To'liq ro'yxat** + filtr: status (active/expiring/frozen/expired/pending) ·
  tarif · muddat bo'yicha sort · qidiruv (ism/ID/telefon).
- **A'zo profili:** to'liq membership tarixi · to'lov tarixi · kelish tarixi ·
  **freeze tarixi** · **izohlar (notes)** · aloqa.
- **Inline amallar:** activate/uzaytirish · freeze/unfreeze · **tarif o'zgartirish** ·
  izoh qo'shish.
- **CSV eksport** (a'zolar/to'lovlar).
- Backend: `members_list` (paginated/filtered) · `member_note_add` · `membership_extend`.
- DoD: 1000+ a'zoда ham tez (pagination); filtrlar ishlaydi; eksport.

### 🟧 A3 — Moliya & to'lovlar
- **To'lov jurnali:** hamma to'lov, filtr (provider/status/sana), qidiruv.
- **Kunlik naqd hisoboti (cash reconciliation):** har xodim kunда qancha naqd oldi
  (kassa yopish uchun).
- **Daromad report:** davr bo'yicha · tarif bo'yicha · provider bo'yicha.
- **Refund/bekor:** to'lovни cancel + membershipни moslash (audit'ga yoziladi).
- Backend: `payments_list · cash_report · revenue_report · payment_refund`.
- DoD: raqamlar to'g'ri (test); refund audit'да; kunlik kassa mos keladi.

### 🟦 A4 — Tariflar & narx boshqaruvi
- Hozir tariflar faqat seed. Panelда: **yaratish/tahrir/o'chirish** (nom, davomiylik,
  app/zal narx, sort, is_active).
- (Ixtiyoriy) **Chegirma / promo-kod** — `promo_codes` jadvali.
- Backend: `plan_list/create/update/set_active` (service-role → `membership_plans`).
- DoD: tarif o'zgarishi ilовада darrov; noto'g'ri narx validatsiyasi.

### 🟪 A5 — Retention & engagement
- **Muddat tugayotganlar** ro'yxati (3/7 kun) → 1-klik "eslatma yubor" yoki uzaytir.
- **Win-back** — yaqinда tugaganlar → aloqa/taklif.
- **Broadcast** — barcha/segmentга e'lon yoki eslatma (push: Expo push token infra
  kerak — alohida mini-loyiha; yoki hozirча in-app banner).
- **Kelish insights:** tez-tez keladigan vs "at-risk" (kelmay qo'ygan) a'zolar.
- Backend: `expiring_list · winback_list` (+ push infra keyin).
- DoD: ro'yxatlar to'g'ri; eslatma yuborish audit'да.

### 🟫 A6 — Sayqal: rollar UI + audit viewer + (ixtiyoriy) SPA
- Rol boshqaruvi UI (kim nimani ko'radi) · audit viewer (filtrlanadigan) ·
  panellarni **birlashtirish** (rol-asosli) · hajm katта bo'lса **React SPA**ga ko'chish.

## 6. Ketma-ketlik mantig'i
**A0 (xavfsizlik/audit) → A1 (dashboard) → A2 (a'zolar) → A3 (moliya) → A4 (tariflar)
→ A5 (retention) → A6 (sayqal).**
A0 birinchi — chunki token/rol/audit keyinги hamma amalни o'raб turadi. Undan keyin
qiymat tartibiда (dashboard eng ko'p ko'rinadigan; moliya biznes uchun; retention o'sish).

## 7. Doimiy qoidalar (conventions)
- **Xavfsizlik chegarasi:** panel service-role bilan RLS'ni chetlaб o'tadi → **auth +
  rol + audit majburiy**. Parol/token hech qачон git'да emas.
- **Dizayn:** Kinetic Editorial (true-black + chartreuse, `--acc:#D4E924`), minimal,
  responsiv (xodim telefonда ishlatadi).
- **Backend:** `admin-verify` (yoki hajm oshsa `admin-*` funksiyalarга bo'lish) —
  har action rol tekshiradi + audit yozadi.
- **Migration:** `-asilbek` yoki `-mirolim` suffiks kelishuvi; RLS locked (faqat
  service-role) `admin_*` jadvallarга.
- **Sifat:** har bosqich CI yashil (tsc/lint/test); ro'yxatlar paginated;
  destructive amallar tasdiqlangan; xato holatlari bor.
- **Handoff:** har bosqich = migration apply + secret + funksiya/panel deploy
  (foydalanuvchi bajaradi — `admin-verify` + Vercel).

## 8. Tez g'alaba (birinchi sprint tavsiya)
1. **A0** (token + rol + `admin_audit` + rate-limit) — poydevor.
2. **A1 Dashboard** — egasi darrov qiymat ko'radi.
3. **A2 A'zolar ro'yxati + filtr** — kundalik ish osonlashadi.
Keyin A3 (moliya) → A4 → A5.

---

## 9. Bajarilgan ish (progress log)

### ✅ A0 — Xavfsizlik poydevori (2026-07, `admin-a0-security` branch)
**Nima o'zgardi:**
- **Migration `0020_admin_security.sql`** — `admin_sessions` (token sessiyalar) +
  `admin_audit` (audit jurnali). Ikkalasi RLS-locked (faqat service-role).
- **`admin-verify` Edge Function:**
  - Yangi `login {password}` → **session token** (12 soat) qaytaradi; **rate-limit**
    (IP bo'yicha 15 daqiqada 8 urinish). Yangi `logout {token}`.
  - Har action endi `{token}` qabul qiladi; **eski `{password}` ham ishlaydi** (orqaga
    moslik — jonli panel buzilmasin).
  - Rollar: **owner** (master ADMIN_PANEL_PASSWORD) · admin · staff; admin-only gate
    endi owner'ni ham o'tkazadi.
  - **Audit** — har mutatsiya (login, activate, order_activate, freeze, unfreeze,
    staff_*, admin_set_password) `admin_audit`ga yoziladi. Yangi `audit_list` (admin).
- **Panellar** (`gym-admin`, `gym-panel`) → login→token oqimiga o'tdi; parol faqat bir
  marta yuboriladi; token localStorage'da; muddati tugasa avtomatik qayta kirish.
- **`gym-admin`** — yangi **"Audit"** tab (kim nima qildi jurnali).

**Deploy tartibi (MUHIM):** 1) migration 0020 → 2) `admin-verify` → 3) Vercel panellar.
**Sinash:** ↓ (keyingi xabarda batafsil).

### ✅ A1 — Dashboard & KPI (2026-07, `admin-a1-dashboard` branch)
**Nima o'zgardi:**
- **`admin-verify`** — yangi `dashboard_stats` action (admin/owner): faol a'zo ·
  7 kunda tugaydigan · muzlatilgan · bugungi kelish · bugun/7 kun/30 kun daromad ·
  peak soat (UTC+5) · 14 kunlik daromad seriyasi · soat bo'yicha kelishlar. Bitta
  so'rovda, memberships/payments/gym_checkins agregatsiyasi.
- **`gym-admin`** — yangi **"Dashboard" tab** (kirishda default): 8 KPI karta +
  2 minimal bar-chart (daromad 14 kun · kelishlar soat bo'yicha), Kinetic Editorial.
**Deploy:** `admin-verify` qayta deploy + `gym-admin` Vercel (migration kerak emas).

### ⬜ A2 — A'zolar boshqaruvi (pro) — keyingi

