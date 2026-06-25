import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";
import { StepShell } from "@/features/onboarding/components/StepShell";
import { useOnboardingStore } from "@/features/onboarding/store";
import {
  EXPERIENCE_VALUES,
  experienceSchema,
} from "@/features/onboarding/schema";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function ExperienceStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const setExperience = useOnboardingStore((s) => s.setExperience);

  const [level, setLevel] = useState<
    (typeof EXPERIENCE_VALUES)[number] | undefined
  >(draft.experience_level);

  const parsed = experienceSchema.safeParse({ experience_level: level });

  function onContinue() {
    if (!parsed.success) return;
    setExperience(parsed.data);
    router.push("/(auth)/onboarding/equipment");
  }

  return (
    <StepShell
      step={4}
      total={5}
      title={t("onboarding.experience.title")}
      subtitle={t("onboarding.experience.subtitle")}
      ctaDisabled={!parsed.success}
      onContinue={onContinue}
    >
      <View style={{ gap: space[3] }}>
        {EXPERIENCE_VALUES.map((value) => (
          <Row
            key={value}
            label={t(`onboarding.experience.options.${value}`)}
            selected={level === value}
            onPress={() => setLevel(value)}
          />
        ))}
      </View>
    </StepShell>
  );
}

function Row({
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
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        borderWidth: selected ? 1 : 0,
        borderColor: selected ? colors.accent : "transparent",
        paddingHorizontal: space[4],
        paddingVertical: space[4],
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.bodyMed,
          color: selected ? colors.accent : colors.textHi,
          fontSize: 15,
          lineHeight: 20,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: selected ? 0 : 1,
          borderColor: colors.border,
          backgroundColor: selected ? colors.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <Check size={13} color={colors.canvas} /> : null}
      </View>
    </Pressable>
  );
}
