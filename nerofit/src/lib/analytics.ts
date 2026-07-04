import type PostHogClass from "posthog-react-native";

type PostHog = PostHogClass;

// The PostHog *project API key* (phc_…) is a write-only PUBLIC key meant to be
// shipped in client apps — like the Supabase anon key, NOT a secret. Read from
// env so it can be empty in dev / Expo Go, in which case analytics no-ops.
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// Lazily resolved. `undefined` = not initialised yet; `null` = unavailable
// (no key, or native module absent — e.g. Expo Go / a build before the rebuild).
let client: PostHog | null | undefined;

// JSON-safe property bag (PostHog rejects non-serialisable values).
export type AnalyticsProps = Record<string, string | number | boolean | null>;

// All analytics events live here so call sites stay typo-free and consistent.
// Add new events to this union before tracking them.
export type AnalyticsEvent =
  | "onboarding_completed"
  | "workout_completed"
  | "exercise_logged"
  | "meal_logged"
  | "food_barcode_scanned"
  | "food_search_selected"
  | "supplement_toggled"
  | "water_logged"
  | "coach_message_sent"
  | "reminders_enabled"
  | "reminders_disabled"
  | "notification_settings_opened"
  | "reminder_toggled"
  | "reminder_time_changed"
  | "password_reset_requested"
  | "account_deleted"
  | "subscription_purchased";

// Initialise once (from the root layout). Loads the native module on demand and
// degrades to a no-op if it throws (older dev client / Expo Go) or no key is set.
export function initAnalytics(): void {
  if (client !== undefined) return;
  if (!KEY) {
    if (__DEV__) {
      console.log("[analytics] No EXPO_PUBLIC_POSTHOG_KEY set — analytics disabled.");
    }
    client = null;
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PostHog = (require("posthog-react-native") as typeof import("posthog-react-native"))
      .default;
    client = new PostHog(KEY, { host: HOST });
  } catch {
    client = null;
  }
}

export function analyticsAvailable(): boolean {
  return !!client;
}

export function track(event: AnalyticsEvent, properties?: AnalyticsProps): void {
  if (!client) return;
  try {
    client.capture(event, properties);
  } catch {
    /* analytics must never break a user flow */
  }
}

export function identifyUser(userId: string, properties?: AnalyticsProps): void {
  if (!client) return;
  try {
    client.identify(userId, properties);
  } catch {
    /* non-fatal */
  }
}

// Drop the identified user on sign-out so subsequent events are anonymous.
export function resetAnalytics(): void {
  if (!client) return;
  try {
    client.reset();
  } catch {
    /* non-fatal */
  }
}

export function trackScreen(name: string): void {
  if (!client) return;
  try {
    client.screen(name);
  } catch {
    /* non-fatal */
  }
}
