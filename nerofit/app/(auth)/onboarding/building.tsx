import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react-native";
import { Button } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { qk } from "@/lib/queries/keys";
import {
  basicsSchema,
  equipmentSchema,
  experienceSchema,
  focusSchema,
} from "@/features/onboarding/schema";
import { useOnboardingStore } from "@/features/onboarding/store";
import { submitOnboarding } from "@/features/onboarding/submit";
import { track } from "@/lib/analytics";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function BuildingStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();
  const qc = useQueryClient();
  const draft = useOnboardingStore((s) => s.draft);
  const reset = useOnboardingStore((s) => s.reset);

  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      try {
        const basics = basicsSchema.parse(draft);
        const focus = focusSchema.parse(draft);
        const experience = experienceSchema.parse(draft);
        const equipment = equipmentSchema.parse(draft);
        if (!userId) throw new Error("Not authenticated");

        await submitOnboarding(userId, {
          ...basics,
          ...focus,
          ...experience,
          ...equipment,
        });

        if (cancelled) return;

        track("onboarding_completed", { focus: focus.focus });
        await qc.invalidateQueries({ queryKey: qk.profile(userId) });
        reset();
        router.replace("/(tabs)");
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [draft, qc, reset, retryKey, router, userId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Centered headline */}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: space[5],
          gap: space[5],
        }}
      >
        <Text
          style={{
            fontFamily: fonts.display,
            color: colors.textHi,
            fontSize: 40,
            lineHeight: 44,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {t("onboarding.building.title")}
        </Text>

        {error ? (
          <View style={{ gap: space[4], width: "100%" }}>
            <Text style={[typography.body, { textAlign: "center" }]}>{error}</Text>
            <Button
              label={t("common.retry")}
              onPress={() => setRetryKey((n) => n + 1)}
            />
          </View>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </View>

      {/* Status pill anchored to the bottom (design) */}
      {!error ? (
        <View style={{ alignItems: "center", paddingBottom: space[6] }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space[2],
              paddingHorizontal: space[4],
              paddingVertical: space[2],
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Sparkles size={14} color={colors.accent} />
            <Text style={typography.labelCaps}>
              {t("onboarding.building.status")}
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
