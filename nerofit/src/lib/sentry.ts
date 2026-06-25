// Crash & error reporting. Mirrors the defensive pattern used by analytics.ts
// and notifications.ts: the native module is loaded lazily and everything is a
// no-op unless EXPO_PUBLIC_SENTRY_DSN is set AND the native module is present
// (so Expo Go / a dev build made before the Sentry install never crash).
//
// The DSN is a publishable client identifier (safe to ship), NOT a secret.
// Source-map upload (readable stack traces) needs SENTRY_AUTH_TOKEN at build
// time — see eas.json / Phase 8 notes; runtime capture works without it.

type SentryModule = typeof import("@sentry/react-native");

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

// `undefined` = not resolved yet; `null` = unavailable (no native module).
let sentry: SentryModule | null | undefined;

function load(): SentryModule | null {
  if (sentry !== undefined) return sentry;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentry = require("@sentry/react-native") as SentryModule;
  } catch {
    sentry = null;
  }
  return sentry;
}

// Initialise once, as early as possible. No DSN → disabled (no-op).
export function initSentry(): void {
  if (!DSN) {
    if (__DEV__) console.log("[sentry] No EXPO_PUBLIC_SENTRY_DSN set — crash reporting disabled.");
    return;
  }
  const Sentry = load();
  if (!Sentry) return;
  try {
    Sentry.init({
      dsn: DSN,
      sendDefaultPii: false,
      // Disable performance tracing for now; this is crash/error reporting only.
      tracesSampleRate: 0,
    });
  } catch {
    /* reporting must never break app startup */
  }
}

export function captureException(error: unknown): void {
  if (!DSN) return;
  try {
    load()?.captureException(error);
  } catch {
    /* non-fatal */
  }
}

// Tie reports to the signed-in user; pass null on sign-out.
export function setSentryUser(userId: string | null): void {
  if (!DSN) return;
  try {
    load()?.setUser(userId ? { id: userId } : null);
  } catch {
    /* non-fatal */
  }
}

// Wrap the root component so Sentry can attach error boundaries / touch events.
// Falls through to the plain component when Sentry is unavailable.
export function wrapApp<C>(Component: C): C {
  if (!DSN) return Component;
  const Sentry = load();
  if (!Sentry) return Component;
  try {
    return Sentry.wrap(Component as never) as C;
  } catch {
    return Component;
  }
}
