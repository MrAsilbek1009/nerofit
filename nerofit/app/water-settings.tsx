import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import { Button, WheelPicker } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { useProfile, useUpdateProfile } from "@/lib/queries/profile";
import { colors, space, typography } from "@/theme";

// Serving = one tap of the Home water +/- button. A constrained choice, so a
// wheel (not free-text) per the input convention.
const SERVING_OPTIONS_ML = [150, 200, 250, 300, 500, 750, 1000];
const DEFAULT_SERVING_ML = 250;
// General hydration recommendation shown as guidance (not the user's own goal).
const RECOMMENDED_ML = 2000;

function Header({ onClose, title }: { onClose: () => void; title: string }) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: space[5],
        paddingVertical: space[3],
      }}
    >
      <Pressable
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.close")}
        style={{ position: "absolute", left: space[5] }}
      >
        <X size={24} color={colors.textHi} />
      </Pressable>
      <Text style={typography.h2}>{title}</Text>
    </View>
  );
}

export default function WaterSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();
  const profile = useProfile(userId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header onClose={() => router.back()} title={t("home.waterSettings.title")} />
      {profile.isLoading || !profile.data ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        // Mount the form only once the profile is loaded so the wheel's initial
        // state reflects the saved serving (useState seeds from `initial` once).
        <WaterSettingsForm
          initial={profile.data.water_serving_ml ?? DEFAULT_SERVING_ML}
        />
      )}
    </SafeAreaView>
  );
}

function WaterSettingsForm({ initial }: { initial: number }) {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();
  const update = useUpdateProfile(userId);

  const [serving, setServing] = useState(initial);

  // Keep the saved value selectable even if it isn't one of the presets.
  const items = Array.from(new Set([...SERVING_OPTIONS_ML, initial]))
    .sort((a, b) => a - b)
    .map((ml) => ({ label: `${ml} ml`, value: ml }));

  function onSave() {
    update.mutate(
      { water_serving_ml: serving },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <>
      <View style={{ flex: 1, paddingHorizontal: space[5], gap: space[6] }}>
        {/* Serving size */}
        <View style={{ gap: space[4], marginTop: space[4] }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={typography.labelCaps}>
              {t("home.waterSettings.servingSize")}
            </Text>
            <Text style={[typography.body, { color: colors.accent }]}>
              {serving} ml
            </Text>
          </View>

          <WheelPicker
            columns={[
              { key: "serving", items, value: serving, onChange: setServing },
            ]}
          />
        </View>

        {/* Guidance */}
        <View style={{ gap: space[2], alignItems: "center" }}>
          <Text style={[typography.body, { textAlign: "center" }]}>
            {t("home.waterSettings.question")}
          </Text>
          <Text style={[typography.bodyMuted, { textAlign: "center" }]}>
            {t("home.waterSettings.hint", {
              goal: RECOMMENDED_ML,
              liters: RECOMMENDED_ML / 1000,
            })}
          </Text>
        </View>
      </View>

      {/* Footer */}
      {update.isError ? (
        <Text
          style={[
            typography.bodyMuted,
            { color: colors.danger, textAlign: "center", paddingHorizontal: space[5] },
          ]}
        >
          {t("common.error")}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          gap: space[3],
          paddingHorizontal: space[5],
          paddingBottom: space[4],
          paddingTop: space[3],
        }}
      >
        <View style={{ flex: 1 }}>
          <Button
            label={t("common.cancel")}
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={t("home.waterSettings.save")}
            loading={update.isPending}
            onPress={onSave}
          />
        </View>
      </View>
    </>
  );
}
