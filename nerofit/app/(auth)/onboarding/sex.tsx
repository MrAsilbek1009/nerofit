import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StepShell } from "@/features/onboarding/components/StepShell";
import { useOnboardingStore } from "@/features/onboarding/store";
import { SEX_VALUES, sexSchema } from "@/features/onboarding/schema";
import { colors, fonts, radii, space } from "@/theme";

export default function SexStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const setSex = useOnboardingStore((s) => s.setSex);

  const [sex, setSexValue] = useState<(typeof SEX_VALUES)[number] | undefined>(
    draft.sex,
  );

  const parsed = sexSchema.safeParse({ sex });

  function onContinue() {
    if (!parsed.success) return;
    setSex(parsed.data);
    router.push("/(auth)/onboarding/basics");
  }

  return (
    <StepShell
      step={1}
      total={4}
      title={t("onboarding.basics.sexLabel")}
      ctaDisabled={!parsed.success}
      onContinue={onContinue}
    >
      <View style={{ flexDirection: "row", gap: space[3] }}>
        {SEX_VALUES.map((value) => (
          <SexTile
            key={value}
            label={t(`onboarding.basics.sex.${value}`)}
            symbol={SEX_SYMBOL[value]}
            selected={sex === value}
            onPress={() => setSexValue(value)}
          />
        ))}
      </View>
    </StepShell>
  );
}

const SEX_SYMBOL: Record<(typeof SEX_VALUES)[number], string> = {
  male: "♂",
  female: "♀",
  non_binary: "⚧",
};

function SexTile({
  label,
  symbol,
  selected,
  onPress,
}: {
  label: string;
  symbol: string;
  selected: boolean;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        flex: 1,
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        borderWidth: selected ? 1 : 0,
        borderColor: selected ? colors.accent : "transparent",
        paddingVertical: space[5],
        alignItems: "center",
        gap: space[2],
        opacity: pressed ? 0.85 : 1,
      }}
    >
      <Text style={{ color: colors.textHi, fontSize: 26 }}>{symbol}</Text>
      <Text
        style={{
          fontFamily: fonts.bodyMed,
          color: colors.textHi,
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
