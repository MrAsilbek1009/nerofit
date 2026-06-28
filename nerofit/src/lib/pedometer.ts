// Step counting via expo-sensors Pedometer. Defensive like analytics/sentry:
// the native module is loaded lazily and every path returns null when steps
// aren't available (Expo Go, no permission, simulator, or Android — where
// getStepCountAsync isn't supported). iOS reads today's CMPedometer history.

type PedometerModule = typeof import("expo-sensors").Pedometer;

let pedometer: PedometerModule | null | undefined;

function load(): PedometerModule | null {
  if (pedometer !== undefined) return pedometer;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pedometer = (require("expo-sensors") as typeof import("expo-sensors")).Pedometer;
  } catch {
    pedometer = null;
  }
  return pedometer;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Today's step count, or null when unavailable. Requests motion permission on
// first call.
export async function getTodaySteps(): Promise<number | null> {
  const P = load();
  if (!P) return null;
  try {
    const available = await P.isAvailableAsync();
    if (!available) return null;

    const current = await P.getPermissionsAsync();
    if (!current.granted) {
      const requested = await P.requestPermissionsAsync();
      if (!requested.granted) return null;
    }

    const { steps } = await P.getStepCountAsync(startOfToday(), new Date());
    return steps ?? 0;
  } catch {
    // Android historical query is unsupported; treat as unavailable.
    return null;
  }
}
