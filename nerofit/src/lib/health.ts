// Cross-platform activity source. Prefers HealthKit (iOS, via the local
// `nerofit-health` Swift module) for real steps + active energy, and falls back
// to the expo-sensors pedometer when HealthKit is unavailable (Android, Expo Go,
// a dev build without the module, or authorization denied). Defensive like
// pedometer.ts — every path resolves a value or null, never throws.

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { getTodaySteps as getPedometerSteps } from "@/lib/pedometer";

type NerofitHealthNative = {
  isAvailable(): boolean;
  requestAuthorization(): Promise<boolean>;
  getTodaySteps(): Promise<number | null>;
  getTodayActiveEnergy(): Promise<number | null>;
};

let health: NerofitHealthNative | null | undefined;
let authorized: boolean | undefined;

function load(): NerofitHealthNative | null {
  if (health !== undefined) return health;
  // iOS-only; returns null (never throws) on Android or a build without it.
  health =
    Platform.OS === "ios"
      ? requireOptionalNativeModule<NerofitHealthNative>("NerofitHealth")
      : null;
  return health;
}

// Prompt for HealthKit read access once. `success` only means the prompt was
// shown (HealthKit hides read-authorization status for privacy) — denied reads
// simply return null below and fall through to the pedometer/estimate.
async function ensureAuthorized(hk: NerofitHealthNative): Promise<boolean> {
  if (authorized !== undefined) return authorized;
  try {
    if (!hk.isAvailable()) {
      authorized = false;
    } else {
      authorized = await hk.requestAuthorization();
    }
  } catch {
    authorized = false;
  }
  return authorized;
}

// Today's steps: HealthKit when available, otherwise the device pedometer.
export async function getTodaySteps(): Promise<number | null> {
  const hk = load();
  if (hk && (await ensureAuthorized(hk))) {
    try {
      const steps = await hk.getTodaySteps();
      if (steps != null) return Math.round(steps);
    } catch {
      /* fall through to the pedometer */
    }
  }
  return getPedometerSteps();
}

// Today's REAL active energy burned (kcal) from HealthKit, or null when
// unavailable — callers then fall back to estimateCaloriesBurned().
export async function getTodayActiveEnergy(): Promise<number | null> {
  const hk = load();
  if (hk && (await ensureAuthorized(hk))) {
    try {
      const kcal = await hk.getTodayActiveEnergy();
      if (kcal != null) return Math.round(kcal);
    } catch {
      /* fall through */
    }
  }
  return null;
}
