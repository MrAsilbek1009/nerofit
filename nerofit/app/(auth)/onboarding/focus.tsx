import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";
import { ChoiceImageCard } from "@/features/onboarding/components/ChoiceImageCard";
import { StepShell } from "@/features/onboarding/components/StepShell";
import { FOCUS_IMAGES } from "@/features/onboarding/images";
import { useOnboardingStore } from "@/features/onboarding/store";
import {
  ACTIVITY_VALUES,
  FOCUS_VALUES,
  focusSchema,
} from "@/features/onboarding/schema";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function FocusStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const setFocus = useOnboardingStore((s) => s.setFocus);

  const [focus, setFocusValue] = useState<
    (typeof FOCUS_VALUES)[number] | undefined
  >(draft.focus);
  const [activity, setActivity] = useState<
    (typeof ACTIVITY_VALUES)[number] | undefined
  >(draft.activity_level);

  const parsed = focusSchema.safeParse({ focus, activity_level: activity });

  function onContinue() {
    if (!parsed.success) return;
    setFocus(parsed.data);
    router.push("/(auth)/onboarding/equipment");
  }

  return (
    <StepShell
      step={3}
      total={4}
      title={t("onboarding.focus.title")}
      ctaDisabled={!parsed.success}
      onContinue={onContinue}
    >
      <View style={{ gap: space[3] }}>
        {FOCUS_VALUES.map((value) => {
          const selected = focus === value;
          return (
            <ChoiceImageCard
              key={value}
              imageUri={FOCUS_IMAGES[value]}
              title={t(`onboarding.focus.options.${value}`)}
              selected={selected}
              onPress={() => setFocusValue(value)}
              showRadio
            />
          );
        })}
      </View>

      <View style={{ gap: space[3] }}>
        <Text style={typography.labelCaps}>
          {t("onboarding.focus.activityLabel")}
        </Text>
        <View style={{ gap: space[2] }}>
          {ACTIVITY_VALUES.map((value) => {
            const selected = activity === value;
            return (
              <ActivityRow
                key={value}
                label={t(`onboarding.focus.activity.${value}`)}
                selected={selected}
                onPress={() => setActivity(value)}
              />
            );
          })}
        </View>
      </View>
    </StepShell>
  );
}

function ActivityRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        borderWidth: selected ? 1 : 0,
        borderColor: selected ? colors.accent : "transparent",
        paddingHorizontal: space[4],
        paddingVertical: space[3],
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodyMed,
          color: selected ? colors.accent : colors.textHi,
          fontSize: 15,
        }}
      >
        {label}
      </Text>
      <Indicator selected={selected} />
    </Pressable>
  );
}

function Indicator({ selected }: { selected: boolean }) {
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: selected ? 0 : 1,
        borderColor: colors.border,
        backgroundColor: selected ? colors.accent : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected ? <Check size={12} color={colors.canvas} /> : null}
    </View>
  );
}
