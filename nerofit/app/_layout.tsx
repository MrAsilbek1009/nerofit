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
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* splash already hidden; non-fatal */
});

export default function RootLayout() {
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
    return bootstrapAuth();
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
  const userId = useUserId();
  const profileQuery = useProfile(userId);

  // Tie analytics identity to the signed-in user; reset on sign-out.
  useEffect(() => {
    if (userId) identifyUser(userId);
    else resetAnalytics();
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

    // Signed out → push to login.
    if (!session) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    // Signed in but profile not loaded yet → wait.
    if (!profileQuery.data) return;

    const needsOnboarding = !profileQuery.data.onboarded_at;

    if (needsOnboarding && !inOnboarding) {
      router.replace("/(auth)/onboarding/basics");
      return;
    }

    // Onboarded user landed on /login or /onboarding → push to tabs.
    if (!needsOnboarding && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, segments, router, profileQuery.data]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workout/[id]" />
      <Stack.Screen name="exercise/[id]" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="progress" />
      <Stack.Screen name="body-composition" />
      <Stack.Screen name="meal-picker" options={{ presentation: "modal" }} />
    </Stack>
  );
}
