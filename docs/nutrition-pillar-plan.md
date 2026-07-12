# Nutrition — ikkinchi asosiy ustun (bosqichma-bosqich reja)

> **Qaror:** Nutrition = Nerofit'ning **ikkinchi asosiy ustuni** (Cal AI / MyFitnessPal /
> MacroFactor bilan raqobat), lekin **bosqichma-bosqich** quriladi (hammasi parallel emas).
> **Dizayn:** "Kinetic Editorial" saqlanadi (true-black + chartreuse, minimal); gamification
> INTIZOM bilan. **Moat:** mahalliy (O'zbek / Markaziy Osiyo) taom bazasi + crowdsource + Verified ✅.
> Sana: 2026-07.

## 1. Raqobat tahlili (dars → Nerofit'ga)

| Ilova | Kuchli tomoni | Nerofit uchun dars |
|---|---|---|
| **Cal AI** | Bitta rasm → porsiya+kaloriya; oddiy, katta typografiya; streak | Bizda scan bor. Onboarding social-proof + streak modal + daily-breakdown ekrani olamiz |
| **Foodvisor** | Rasm + **gram/porsiyani tap bilan tahrir**; yashirin ingredient (yog'/sous); "aniqlashtiruvchi savol" | Natija-muharrirga **gram slider + "Fix with AI"** qo'shamiz; AI 100% emas — tez tahrir shart |
| **MacroFactor** | **Adaptiv TDEE** — haftalik vazn-trend vs intake → maqsadni qayta hisoblaydi; "adherence-neutral" (ayblamaydi) | **Retention richagi.** Statik maqsad → adaptiv; qizil/stress yo'q, "rejang yangilandi" |
| **Lifesum** | Toza UX + gamification (Life Score, streak, challenge) LEKIN sekin log (30-45s) | Gamification olamiz, sekinlikni EMAS. Log 2-3 tap bo'lsin |
| **Lose It!** | Tez, oddiy, arzon, barqaror | Soddalik + tezlik = ustuvor; ortiqcha animatsiya yo'q |
| **MyFitnessPal** | Katta baza + **Verified ✅** (dietolog tekshirgan) | LEKIN dedup yo'q, dublikatlar — **bizning ustunlik: toza, verified, regional baza** |

**Bozor bo'shlig'i (moat):** hech kimda O'zbek taomlari (palov, somsa, manti, lag'mon, qozon kabob)
va mahalliy do'kon shtrix-kodlari yo'q/xato. Buni to'g'ri qilsak — ajralib chiqamiz.

## 2. Nerofit'da hozir bor (asos)

food-scan (rasm AI/Edge · barcode+search OpenFoodFacts · scan tarixi · rasm→Storage) ·
`meal_logs` (catalog/scan/manual) · `meals` katalog · makros · suv · qo'shimchalar ·
natija-muharrir (ResultStage: nom/servings/slot) · profil goals (statik) · onboarding.

## 3. Bosqichma-bosqich reja

### 🟩 Bosqich N1 — Mahalliy food DB + crowdsource + Verified ✅ (MOAT — birinchi)
Nima uchun birinchi: bu bizni ajratadigan yagona narsa; qolgani busiz shunchaki yana bir tracker.
- **Migration** (`00XX-mirolim_foods.sql`): `foods` jadvali — `name, brand, region, barcode,
  per_serving + per_100g makros, serving options (jsonb), source (seed/community/off),
  is_verified, created_by, created_at`. RLS: hamma **verified**ni + o'zinikini o'qiydi;
  insert own (community, unverified); `is_verified` faqat moderatsiya (service-role/admin).
- **Seed**: 30-50 O'zbek/MO taomi verified makros bilan (palov, somsa, manti, lag'mon, non, shashlik…).
- **Qidiruv tartibi**: avval mahalliy `foods` (regional) → keyin OpenFoodFacts fallback.
  Natijada **Verified ✅** yashil belgi (MFP darsi, lekin toza/dedupsiz).
- **"Taom qo'shish"** ekrani (crowdsource): foydalanuvchi taom+porsiya+makros yuboradi →
  `foods`ga unverified community sifatida → o'zi + boshqalar ishlatadi, verify navbatiga.
- **Moderatsiya/verify**: mavjud **gym-admin web panel**ini kengaytirib (docs/gym-admin) —
  community taomlarni ko'rib chiqish + Verified belgilash.
- **Barcode → baza**: skanlangan mahalliy shtrix-kodlar `foods`ga tushib, baza o'sib boradi.
- 🧑 Handoff: migration apply + seed; admin verify oqimi.

### 🟨 Bosqich N2 — Tez log + aqlli scan tahriri (Cal AI/Foodvisor/Lose It)
- **Natija-muharrir yangilanishi ✅** (branch `phase-16-n2-scan-editor`): **gram/miqdor slider** +
  birlik almashtirish (porsiya/gram) ✅; **"Fix with AI"** — matn bilan tuzatish → qayta
  baholash (food-analysis Edge'ga hint; rasmli va rasmsiz) ✅; yashirin ingredient (yog'/sous)
  hint orqali qayta baholanadi ✅. "Dona" birligi keyinga qoldi.
- **Tez log ✅**: meal-picker → "Log food hub" (Tezkor/Katalog/Taomlarim tablari):
  recent (meal_logs'dan 14 kun) + favoritlar (yulduzcha, `favorite_foods`) + quick-add
  (faqat kkal majburiy — Cal AI qoidasi) + to'la slotlarda ham "+". Maqsad: 2-3 tap ✅.
- **Meal builder ✅**: `app/meal-builder` — nom + jonli yig'indi + qidiruvdan (lokal+OFF)
  yoki recent'dan item qo'shish → `user_meals`; picker'dan bir tap log (source=manual).
- 🧑 Handoff: "Fix with AI" food-analysis Edge deploy ✅ (2026-07-12) · migration
  `0020-mirolim_fast_log.sql` apply qilinishi kerak (favorite_foods + user_meals).

### 🟧 Bosqich N3 — Adaptiv goals ("adherence-neutral") — RETENTION ✅ (asosiy qism)
- **Rolling weight trend ✅**: EWMA (α=0.3) kunlik vazn ustidan — `src/lib/nutrition/adaptive.ts`.
- **Adaptiv TDEE ✅**: haftalik client-trigger (Nutrition tab ochilganda, scheduler yo'q —
  atayin): 14 kunlik to'liq intake o'rtachasi − trend×7700/7 → TDEE; focus bo'yicha
  (lose_fat −0.5%BW/hafta, build_muscle +0.25%, stay_fit 0) yangi kkal; **±150 kkal
  qadam-cheklov** (konservativ); makrolar: protein 1.8g/kg trend, yog' 25% kkal, qolgani carbs.
  **Data gate**: ≥8 to'liq kun (≥1000 kkal)/14 kun + ≥4 tortilish/21 kun (≥10 kun oralig'i) —
  yetmasa maqsadlar TEGILMAYDI (adherence-neutral).
- **`nutrition_targets` tarix ✅** (`0021-mirolim_adaptive_goals.sql`); profiles makro goals
  jonli manba bo'lib qoladi (Home ring + MacroBar avtomatik yangilanadi — birinchi marta
  onboarding'dan keyin yozuvchi paydo bo'ldi, avval statik 200/300/80 edi!).
- **UX ✅**: "Rejang yangilandi" kartasi (3 kun ko'rinadi, oq/kulrang, qizil yo'q).
- 🧑 Handoff: migration `0021` apply. Qolgan (N3.1): progress ekranida smoothed trend-line,
  vazn kiritish eslatmasi, adaptiv on/off toggle.

### 🟦 Bosqich N4 — Nutrition hub + insights + intizomli gamification ✅ (asosiy qism)
- **Daily Breakdown ✅** (`app/daily-breakdown.tsx`, Nutrition→Macros "Xulosa" havolasi):
  kaloriya ring (bugungi/goal %) + makro barlar + shu hafta kkal grafigi (TrendChart) +
  logʻlangan kunlar oʻrtachasi + TDEE/trend qatori (adaptivdan) + **Edit goals**.
- **Edit goals ✅** (`app/edit-goals.tsx`): P/C/F gramm → jonli kkal; saqlash `profiles`ga
  + `nutrition_targets`ga `reason='manual'` yozadi — adaptiv keyingi hafta shu raqamdan
  qadam tashlaydi (urishmaydi).
- **Streak celebration modal ✅**: ovqat-log streak (ketma-ket kunlar, insights.ts sof
  mantiq + 17 test), kuniga bir marta birinchi logdan keyin (AsyncStorage flag), olov +
  raqam + hafta nuqtalari (chartreuse — plan ruxsati), "zanjirni uzma" ohangi.
- **N4.1 ✅** (branch `phase-16-n4-1-gamification`): **6 ta derived badge** (7/30-kun streak,
  100 log, 10 skan, taom qo'shish, 7/7 hafta) — jadvalsiz/enginesiz, o'qish payti hisoblanadi
  (`lib/nutrition/badges.ts` sof + `nutritionStats` head-count api), Profile'da "Yutuqlar"
  bo'limi; **haftalik maqsad** (5 kun log, ProgressLine) va **health-score** (Home formulasi
  qayta ishlatildi) Daily Breakdown'da. Migration YO'Q.

### 🟪 Bosqich N5 — Standalone / freemium (ikkinchi daromad)
- Zalga bormaydigan foydalanuvchilar ham nutrition'ni ishlatadi.
- **Nutrition obunasi** (raqamli mahsulot → App Store/Play subscription; RevenueCat bu yerda mos).
- Paywall: AI scan limiti, insights, adaptiv coaching = premium.
- Pozitsiyalash: "zal + nutrition" yoki nutrition'ni alohida brend sifatida.

## 4. Ketma-ketlik mantig'i
N1 (moat) → N2 (tez log/tahrir) → N3 (adaptiv/retention) → N4 (hub/gamification) → N5 (freemium).
Har bosqich mustaqil qiymat beradi; N1 busiz qolgani ajralib turmaydi.

## 5. Doimiy qoidalar
Kinetic Editorial (theme tokens, chartreuse intizom, gradient/glow yo'q) · i18n uz/ru/en ·
DB faqat `src/lib/api/*` + TanStack Query · RLS har jadvalda · TS strict · migration `-mirolim` ·
har bosqich CI yashil (tsc/lint/test) · handoff (migration/Edge/seed/admin) = foydalanuvchi.

## 6. Manbalar
- Cal AI (Mobbin) — `docs/cal-ai-flow-study.md`
- Foodvisor portion/gram tahrir — https://foodvisor.zendesk.com/hc/en-us/articles/360013672119
- MacroFactor adaptiv TDEE — https://help.macrofactorapp.com/en/articles/26
- MyFitnessPal Verified/check — https://support.myfitnesspal.com/hc/en-us/articles/360032273292
- Lifesum vs Lose It — https://fuelnutrition.app/compare/lifesum-vs-lose-it
