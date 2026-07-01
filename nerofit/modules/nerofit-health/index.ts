import { requireOptionalNativeModule } from "expo-modules-core";

export type NerofitHealthModule = {
  /** HealthKit is present on this device (iOS, not iPad without Health). */
  isAvailable(): boolean;
  /** Prompt for READ access to steps + active energy. Resolves granted. */
  requestAuthorization(): Promise<boolean>;
  /** Today's cumulative step count, or null when unavailable. */
  getTodaySteps(): Promise<number | null>;
  /** Today's active energy burned in kcal, or null when unavailable. */
  getTodayActiveEnergy(): Promise<number | null>;
};

// null on Android / Expo Go / a dev build made before this module was added —
// callers must guard (see src/lib/health.ts). Never throws.
export const NerofitHealth =
  requireOptionalNativeModule<NerofitHealthModule>("NerofitHealth");
