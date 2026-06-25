# Phase 10 — Monetizatsiya (RevenueCat) · Handoff

Branch: `phase-10-revenuecat`

Bu fazada **obuna infratuzilmasi** qo'shildi: RevenueCat wrapper, Elite
entitlement holati, va paywall ekrani. **Hozircha hech qaysi funksiya
bloklanmagan** (qaror: premium funksiyalar keyin tanlanadi) — lekin `useIsElite()`
hook tayyor, istalgan vaqtda gate qo'shish bir qator kod.

---

## Nima qilindi (kod, 🤖)

- `src/lib/purchases.ts` — RevenueCat wrapper, **analytics kabi lazy + kalitsiz
  no-op**: API key / native modul bo'lmasa hech narsa buzilmaydi. Entitlement
  identifikatori = **`elite`**.
- `src/store/entitlement.ts` + `src/hooks/useEntitlement.ts` — `useIsElite()`:
  RevenueCat entitlement **yoki** `profiles.subscription_tier === "elite"`
  (RC sozlanmaganda DB orqali ishlaydi).
- `app/paywall.tsx` — modal paywall (offerings, sotib olish, restore). Holatlar:
  loading / paketlar / "coming soon" (RC sozlanmagan) / "siz Elite'dasiz".
  Profile → "Subscription" qatori endi paywall'ni ochadi; badge `useIsElite`'dan.
- `_layout.tsx` — kirgan foydalanuvchini RevenueCat'ga bog'laydi + entitlement
  sync (no-op until configured).
- i18n (`paywall.*`) en/uz/ru; `.env.example`'da RC kalitlari.

**Gate qo'shish (keyin, 1 qator):** istalgan ekranda
`const isElite = useIsElite();` → `if (!isElite) router.push("/paywall")` yoki
premium UI'ni shartli ko'rsatish.

---

## 🧑 Qo'lda bajariladigan qadamlar (RevenueCat)

1. **Akkaunt** — https://app.revenuecat.com da loyiha yarating.
2. **Do'kon ulanishi** — App Store Connect (iOS — Phase 12 Apple akkauntdan keyin)
   va/yoki Google Play. Mahsulotlarni (obuna) do'konda yarating.
3. **Entitlement** — RevenueCat'da entitlement yarating, nomi **aynan `elite`**
   (kod shuni tekshiradi). Mahsulotlarni unga biriktiring.
4. **Offering** — "default/current" offering yarating, paketlar (oylik/yillik) qo'shing.
5. **API kalitlar** — RevenueCat → API keys (platforma bo'yicha). Ularni:
   - lokal sinash uchun `nerofit/.env`: `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `..._ANDROID_KEY`
   - production uchun EAS env vars (Phase 8 `PHASE8_HANDOFF.md` kabi).
6. **Dev build'ni qayta quring** (`npx expo run:ios`) — native modul yangi build'da.
7. **Sandbox test** — test obuna sotib oling → paywall'da "siz Elite'dasiz" + Profile badge "Elite".

### (Ixtiyoriy, keyin) Server-side tier sync
Agar server funksiyalarini gate qilmoqchi bo'lsangiz (masalan AI limit), RevenueCat
**webhook** → Edge Function `profiles.subscription_tier` ni `elite`/`free` qilib
yangilasin (service-role bilan). Shunda `useIsElite` ham, server ham mos bo'ladi.

---

## Eslatma
Paywall'dagi benefit matnlari (`paywall.benefits`, en/uz/ru) hozir umumiy.
Premium funksiyalarni tanlaganingizda ularni shu funksiyalarga moslang.

## DoD holati
- ✅ Wrapper / entitlement / paywall (kod) — RC sozlangach to'liq ishlaydi.
- ✅ `useIsElite` gate tayyor (hozircha hech narsa bloklanmagan — qaror).
- 🧑 RevenueCat akkaunt + do'kon mahsulotlari + API kalitlar.
