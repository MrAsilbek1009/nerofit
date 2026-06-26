# Data Safety (Google Play) / App Privacy (Apple) — Declaration

Use this to fill **Google Play Console → App content → Data safety** and
**App Store Connect → App Privacy**. It reflects what the current code collects.
Re-verify before submission if SDKs change.

## Summary
- **Encrypted in transit:** Yes.
- **Users can request deletion:** Yes — in-app **Profile → Delete Account**
  permanently deletes the account and associated data.
- **Data used for tracking / advertising:** No. No ad SDKs; analytics is
  first-party product analytics only.
- **Data sold:** No.

## What is collected, and why

| Data type | Collected | Linked to user | Purpose | Processor |
|---|---|---|---|---|
| Email address | Yes | Yes | Account creation & auth | Supabase |
| Name | Yes (if entered) | Yes | App personalization | Supabase |
| Health & fitness (workouts, body metrics, nutrition, water, optional HR/BP) | Yes | Yes | Core app function | Supabase |
| User messages to AI coach | Yes | Yes | Generate AI responses | Supabase, Anthropic |
| Purchase history / subscription status | Yes | Yes | Provide & restore premium | RevenueCat, Apple/Google |
| App activity / in-app events | Yes | Pseudonymous | Analytics, app improvement | PostHog |
| Crash logs & diagnostics | Yes | No (PII off) | Stability / bug fixing | Sentry |
| App info & performance, device/OS | Yes | Pseudonymous | Diagnostics | Sentry, PostHog |

## NOT collected
Precise or coarse location, contacts, photos/media library, calendar,
microphone/camera, browsing history, SMS/call logs, advertising ID.

## Apple App Privacy mapping (nutrition label)
- **Data Used to Track You:** None.
- **Data Linked to You:** Contact Info (email, name), Health & Fitness,
  Purchases, User Content (AI chat), Identifiers (user ID), Usage Data.
- **Data Not Linked to You:** Diagnostics (crash logs).

## Google Play Data safety mapping
- Personal info → Email, Name. (Collected, encrypted in transit, deletable.)
- Health and fitness → fitness/health info. (Collected.)
- Financial info → purchase history. (Collected.)
- App activity / App info and performance → analytics & diagnostics. (Collected.)
- Messages → in-app AI chat content. (Collected, app functionality.)
- Data sharing: with processors only (not for their independent use); not sold.

## Notes for the forms
- List third parties as **service providers / processors**, not "data sharing for
  others' use".
- Provide the privacy policy URL:
  `https://mrasilbek1009.github.io/nerofit/privacy-policy.html`.
- If you later disable PostHog/Sentry/RevenueCat (no keys set), update the
  declaration accordingly — without keys those SDKs collect nothing.
