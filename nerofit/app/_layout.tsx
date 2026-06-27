import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { SplashScreen, Stack, useRouter, useSegments, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useProfile } from "@/lib/queries/profile";
import { useUserId } from "@/hooks/useUser";
import {
  identifyUser,
  initAnalytics,
  resetAnalytics,
  trackScreen,
} from "@/lib/analytics";
import {
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  useFonts as useHankenFonts,
} from "@expo-google-fonts/hanken-grotesk";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

import "../global.css";
import "@/i18n";
import { queryClient } from "@/lib/queryClient";
import { bootstrapAuth, useAuthStore } from "@/store/auth";
import { initRecoveryLinking } from "@/features/auth/recovery";
import { initSentry, setSentryUser, wrapApp } from "@/lib/sentry";
import {
  addEntitlementListener,
  getCustomerInfo,
  initPurchases,
  isEliteCustomer,
} from "@/lib/purchases";
import { useEntitlementStore } from "@/store/entitlement";
import { colors } from "@/theme";

// Initialise crash reporting as early as possible (no-op without a DSN).
initSentry();

SplashScreen.preventAutoHideAsync().catch(() => {
  /* splash already hidden; non-fatal */
});

function RootLayout() {
  const [fontsLoaded] = useHankenFonts({
    HankenGrotesk_700Bold,
    HankenGrotesk_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const ready = useAuthStore((s) => s.ready);

  useEffect(() => {
    initAnalytics();
    const stopRecoveryLinking = initRecoveryLinking();
    const stopAuth = bootstrapAuth();
    return () => {
      stopRecoveryLinking();
      stopAuth();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && ready) {
      SplashScreen.hideAsync().catch(() => {
        /* already hidden */
      });
    }
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <AuthGate />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const passwordRecovery = useAuthStore((s) => s.passwordRecovery);
  const userId = useUserId();
  const profileQuery = useProfile(userId);

  // Tie analytics + crash-report identity to the signed-in user; clear on sign-out.
  useEffect(() => {
    if (userId) identifyUser(userId);
    else resetAnalytics();
    setSentryUser(userId ?? null);
  }, [userId]);

  // Bind RevenueCat to the user and keep the elite entitlement in sync.
  // No-op until RevenueCat is configured (see src/lib/purchases.ts).
  useEffect(() => {
    const setRcElite = useEntitlementStore.getState().setRcElite;
    if (!userId) {
      setRcElite(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      await initPurchases(userId);
      const info = await getCustomerInfo();
      if (!cancelled) setRcElite(isEliteCustomer(info));
    })();
    const unsubscribe = addEntitlementListener(setRcElite);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId]);

  // Screen views.
  useEffect(() => {
    trackScreen(pathname);
  }, [pathname]);

  useEffect(() => {
    const segs = segments as string[];
    const top = segs[0];
    const second = segs[1];
    const inAuthGroup = top === "(auth)";
    const inOnboarding = inAuthGroup && second === "onboarding";

    // Password recovery in progress → pin to the reset-password screen,
    // regardless of the (recovery) session that is now active.
    if (passwordRecovery) {
      if (!(inAuthGroup && second === "reset-password")) {
        router.replace("/(auth)/reset-password");
      }
      return;
    }

    // Signed out → push to login.
    if (!session) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    // Signed in but profile not loaded yet → wait.
    if (!profileQuery.data) return;

    const needsOnboarding = !profileQuery.data.onboarded_at;

    if (needsOnboarding && !inOnboarding) {
      router.replace("/(auth)/onboarding/sex");
      return;
    }

    // Onboarded user landed on /login or /onboarding → push to tabs.
    if (!needsOnboarding && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, segments, router, profileQuery.data, passwordRecovery]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workout/[id]" />
      <Stack.Screen name="exercise/[id]" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="program/[id]" />
      <Stack.Screen name="program-day/[id]" />
      <Stack.Screen name="program-day-player/[id]" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="workout-generator" options={{ presentation: "modal" }} />
      <Stack.Screen name="custom-workout" />
      <Stack.Screen name="custom-workout-player/[id]" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="progress" />
      <Stack.Screen name="body-composition" />
      <Stack.Screen name="delete-account" />
      <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
      <Stack.Screen name="meal-picker" options={{ presentation: "modal" }} />
    </Stack>
  );
}

// Wrapped so Sentry can attach its error boundary / navigation hooks (no-op
// without a DSN).
export default wrapApp(RootLayout);
