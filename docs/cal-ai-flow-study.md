# Cal AI — flow & UI study (Mobbin)

> Manba: Mobbin — Cal AI iOS ("Food and macro counter", Health & Fitness / AI, 4.6★).
> Maqsad: Cal AI'ning flow + UI patternlarini Nerofit'ga (ayniqsa nutrition + onboarding)
> qo'llash. Nerofit'ning Phase 13 "Cal AI uslubi" allaqachon shu ilhomdan.
> Sana: 2026-07 (Mobbin'da 37 flow qayd etilgan).

## 1. Flow inventari (37 flow)

**Onboarding** — Subscribing to CalAI (paywall)
**Logging a food intake** — voice input · Generating results using AI · **Scanning a food**
**Home** — View daily breakdown · Editing daily goals
**Food detail** — Fixing an issue (AI) · Changing food name · Saving a food · Adding an ingredient · Reporting a food · Deleting a food
**Saved foods** · Adding a custom food · Creating a meal
**Logging an exercise**
Changing water intake settings · View streak · **Progress** (View BMI · weight history)
**Settings** — promo code · personal detail · language · dark mode · live activity · delete account · logout · login
**Live Activities** — Dynamic Island · Widgets

## 2. Asosiy ekranlar (kuzatilgan UI)

### Welcome / auth
"Calorie tracking made easy" — kamera fonda ovqatni skanlaydi. **Get Started** (qora, full-width) + "Already have an account? **Sign In**". Minimal, bitta primary CTA.

### Onboarding (34 ekran!) — savol-savol kalibratsiya
Har ekran naqshi:
- Tepada: **← back** + ingichka **progress bar** + til (EN).
- Katta qalin **savol-heading** (2-3 qator), ostida kulrang subtitle: *"This will be used to calibrate your custom plan."*
- Javob variantlari: **full-width rounded pill** ro'yxati; **tanlangan = to'liq qora + oq matn**, tanlanmagan = och kulrang. Ba'zilarida leading ikonка.
- Pastda bitta **Continue** (qora pill), boshida disabled (kulrang) → tanlangач qora.

Kuzatilgan qadamlar (tartibda): Gender (Male/Female/Other) → Workouts/week (0-2 / 3-5 / 6+, ikonкали) → "Where did you hear about us?" (Instagram/TikTok/TV/Friend/Facebook/Youtube — ikonкали ro'yxat) → "Have you tried other calorie apps?" (No/Yes) → **social-proof**: "Cal AI creates long-term results" (vazn grafigi: Cal AI vs Traditional diet, "80% maintain weight loss 6 months later") → Height & weight (**Imperial/Metric segmented toggle** + iOS **wheel picker**) → "When were you born?" (oy/kun/yil wheel) → Goal (Lose/Maintain/Gain weight) → … → plan generatsiya → paywall.

**Naqsh:** bitta savol = bitta ekran; katta typografiya; social-proof ekranlar (grafik + statistika) motivatsiya uchun; wheel picker (yozish emas).

### Scan (food)
"**Perfect! Scan now.**" (yashil ✓) — ovqat tovoq skanner **burchak-ramkasi**da; tepada 1/2/3 qadam indikator; **✕** yopish. Katta oq shutter tugma.

### Home (dashboard) — och tema
- Header: 🍎 **Cal AI** (chapда) + **streak 🔥 1** (o'ngда).
- **Kun-strip**: aylanа sana badge'lar (W27 T28 F29 … **M1** ← joriy, qisman ring bilan).
- Katta karta: **"1505 · Calories left"** + o'ng tomonда **doiraviy progress ring** (markazда olov ikonка).
- **Makro kartalar** (3 ta): "129g Protein left" · "247g Carbs left" · "7g Fat left" — har birida kichik rangли ring + ikonка.
- Qo'shimcha kartalar: "0/10,000 Steps today" · "0 Calories burned".
- Pastda **tab bar: Home · Progress(chart) · Settings + markazда (+) FAB** (asosiy "log food").

### Daily Breakdown
← back + katta "**Daily Breakdown**". Karta: "Calories **1,298/2,715**" + ring (olov). Makros: 🥩 Protein 78/193g · 🌾 Carbs 67/315g · 💧 Fats 73/75g (rangли ikonка + joriy/maqsad). **"Edit Daily Goals"** (outline pill).

### Water settings (bottom sheet)
"**Water settings**" — **Serving size** wheel (200/250/**500**/750/1,000 ml, ✎). Guidance: "How much water do you need to stay hydrated? … at least 2000 ml (2 L)". **Cancel / Save**.
→ Nerofit'ning `water-settings` ekrani buni deyarli aynan takrorlaydi.

### Streak modal
"🔥 **1 Day streak**" — katta olov + raqam; **S M T W T F S** kun nuqtalari (bajarilgan = to'q sariq ✓); "You're on fire! Every day matters…"; **Continue** (qora pill). Modal card, oq fon.

### Progress
"**Progress**" — "My Weight **73 kg** / Goal 78 kg / Next weigh-in: 7d" + **Day Streak** widget (olov + kun nuqtalari). Period tablar: **90 Days / 6 Months / 1 Year / All time**. "**Goal Progress** — 17% of goal" **line chart**; "You're making progress…". Hafta selektori (This week / Last week / …).

## 3. UI tizimi (Cal AI)

- **Tema:** OCH (oq / off-white fon, qora matn). Accent = **to'q sariq (olov/streak)**; makrolar rangli ikonка (protein qizil, carbs jigarrang/sariq, fats ko'k).
- **Typografiya:** juda katta qalin sarlavhalar (savollar, raqamlar); kulrang ikkilamchi matn.
- **Komponentlar:** full-width **rounded pill** tugma/tanlov (tanlangan = qora); **kartalar** (yumaloq burchak ~16-20px, yumshoq soya/chegara); **doiraviy progress ring** (kaloriya, makro); **wheel picker** (sana/bo'y/vazn/serving); **segmented toggle** (Imperial/Metric, period); **bottom tab + markaziy FAB**.
- **Patternlar:** "**left**" ramkasi (calories left, protein left — deficit); bitta savol = bitta ekran; social-proof grafiklar; streak gamifikatsiyasi (olov + kun nuqtalari + modal); ovqatni skanlash markaziy FAB orqali.

## 4. Nerofit'ga qo'llash (tavsiyalar)

**Nerofit bilan mos (allaqachon):** kaloriya-qoldi ring, makro kartalar, kun-strip, streak, water serving wheel, progress/weight — Nerofit Phase 13'да shundan olingan. ✅

**Farq (ehtiyot bo'ling):**
- **Tema:** Cal AI = OCH; Nerofit = **true black + chartreuse** ("Kinetic Editorial"). Layout/IA'ni oling, rang tizimini EMAS — Nerofit accent intizomiga sodiq qoling.
- **Nav:** Cal AI = 3 tab + FAB (log-markazlashgan); Nerofit = gym-first 5 tab (Asosiy/A'zolik/Ovqatlanish/Murabbiy/Profil). FAB'ni ko'chirmang.

**Olish arziydigan g'oyalar:**
1. **Onboarding'ni granularroq + social-proof** — Nerofit onboarding'iga "natija grafigi" / motivatsiya ekрани qo'shish.
2. **Streak celebration modal** — kunlik streak'da (Nerofit'да streak bor, modal yo'q).
3. **"Fixing an issue" (AI)** — food detail'да AI bilan tuzatish → Nerofit food-scan "Fix with AI" (kelgusi slice) uchun aniq referens.
4. **Food detail** ekрани (ingredient qo'shish, nomni o'zgartirish, saqlash) — Nerofit natija-muharririni kengaytirish.
5. **Daily breakdown** alohida ekрани (Nerofit'да makrolar Nutrition'да; alohida "kunlik xulosa" ekрани foydali).

## 5. Havolalar
- App: https://mobbin.com/apps/cal-ai-ios-c343d59e-c5b7-4fd8-ad3a-673d2ce563b0/542e2577-5f5f-4843-907e-4bec8b404108/flows
- Onboarding flow: https://mobbin.com/flows/579da5dd-453a-4e7c-9c11-d20708a4db82
