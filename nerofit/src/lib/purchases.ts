import { Platform } from "react-native";

// RevenueCat wrapper. Mirrors analytics.ts / sentry.ts: the native module is
// loaded lazily and every call is a no-op unless a RevenueCat API key is set
// AND the native module is present (so Expo Go / a dev build made before the
// install never crash). Entitlement falls back to profiles.subscription_tier
// via useIsElite() when RevenueCat is not configured.
//
// The RevenueCat API keys are publishable client keys (safe to ship), NOT
// secrets. Set them per platform as EXPO_PUBLIC_REVENUECAT_IOS_KEY /
// EXPO_PUBLIC_REVENUECAT_ANDROID_KEY.

type PurchasesStatic = typeof import("react-native-purchases").default;
type CustomerInfo = import("react-native-purchases").CustomerInfo;
type PurchasesOffering = import("react-native-purchases").PurchasesOffering;
type PurchasesPackage = import("react-native-purchases").PurchasesPackage;

// The entitlement identifier configured in the RevenueCat dashboard.
export const ELITE_ENTITLEMENT = "elite";

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: undefined,
});

// `undefined` = not resolved yet; `null` = unavailable (no native module).
let purchases: PurchasesStatic | null | undefined;
let configured = false;

function load(): PurchasesStatic | null {
  if (purchases !== undefined) return purchases;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    purchases = (require("react-native-purchases") as { default: PurchasesStatic }).default;
  } catch {
    purchases = null;
  }
  return purchases;
}

export function purchasesAvailable(): boolean {
  return !!API_KEY && !!load();
}

export function isEliteCustomer(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active[ELITE_ENTITLEMENT];
}

// Configure once and bind the RevenueCat user to our Supabase user id.
export async function initPurchases(userId: string | null): Promise<void> {
  if (!API_KEY) return;
  const P = load();
  if (!P) return;
  try {
    if (!configured) {
      P.configure({ apiKey: API_KEY, appUserID: userId ?? undefined });
      configured = true;
    } else if (userId) {
      await P.logIn(userId);
    }
  } catch {
    /* purchases must never break startup */
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!API_KEY) return null;
  const P = load();
  if (!P) return null;
  try {
    return await P.getCustomerInfo();
  } catch {
    return null;
  }
}

// The current ("default") offering configured in RevenueCat, or null when
// RevenueCat is unavailable / no offering is set up yet.
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!API_KEY) return null;
  const P = load();
  if (!P) return null;
  try {
    const offerings = await P.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

// Lets purchase errors propagate so the paywall can distinguish a user
// cancellation from a real failure.
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const P = load();
  if (!P) throw new Error("Purchases unavailable");
  const { customerInfo } = await P.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  const P = load();
  if (!P) return null;
  try {
    return await P.restorePurchases();
  } catch {
    return null;
  }
}

// Subscribe to entitlement changes (e.g. after a purchase on another device).
export function addEntitlementListener(cb: (isElite: boolean) => void): () => void {
  if (!API_KEY) return () => {};
  const P = load();
  if (!P) return () => {};
  const handler = (info: CustomerInfo) => cb(isEliteCustomer(info));
  try {
    P.addCustomerInfoUpdateListener(handler);
  } catch {
    return () => {};
  }
  return () => {
    try {
      P.removeCustomerInfoUpdateListener(handler);
    } catch {
      /* noop */
    }
  };
}

export type { CustomerInfo, PurchasesOffering, PurchasesPackage };
