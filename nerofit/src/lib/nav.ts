import type { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

// Safe back: on web (or a deep link) there may be no history, and router.back()
// throws "The action 'GO_BACK' was not handled by any navigator". Fall back to a
// concrete route instead.
export function goBack(router: Router, fallback = "/(tabs)/workouts") {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
