import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";  
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StepShell } from "@/features/onboarding/components/StepShell";
import { useOnboardingStore } from "@/features/onboarding/store";
import { basicsSchema, SEX_VALUES } from "@/features/onboarding/schema";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function BasicsStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const setBasics = useOnboardingStore((s) => s.setBasics);

  const [sex, setSex] = useState<(typeof SEX_VALUES)[number] | undefined>(
    draft.sex,
  );
  const [age, setAge] = useState<string>(draft.age?.toString() ?? "");
  const [height, setHeight] = useState<string>(
    draft.height_cm?.toString() ?? "",
  );
  const [weight, setWeight] = useState<string>(
    draft.weight_kg?.toString() ?? "",
  );

  const parsed = basicsSchema.safeParse({
    sex,
    age,
    height_cm: height,
    weight_kg: weight,
  });

  function onContinue() {
    if (!parsed.success) return;
    setBasics(parsed.data);
    router.push("/(auth)/onboarding/focus");
  }

  return (
    <StepShell
      step={1}
      total={4}
      title={t("onboarding.basics.title")}
      ctaDisabled={!parsed.success}
      onContinue={onContinue}
    >
      {/* Sex */}
      <View style={{ gap: space[3] }}>
        <Text style={typography.labelCaps}>
          {t("onboarding.basics.sexLabel")}
        </Text>
        <View style={{ flexDirection: "row", gap: space[3] }}>
          {SEX_VALUES.map((value) => {
            const selected = sex === value;
            return (
              <SexTile
                key={value}
                label={t(`onboarding.basics.sex.${value}`)}
                symbol={SEX_SYMBOL[value]}
                selected={selected}
                onPress={() => setSex(value)}
              />
            );
          })}
        </View>
      </View>

      {/* Number rows */}
      <View style={{ gap: space[3] }}>
        <NumberRow
          label={t("onboarding.basics.age")}
          value={age}
          onChangeText={setAge}
        />
        <NumberRow
          label={t("onboarding.basics.height")}
          value={height}
          onChangeText={setHeight}
          suffix={t("onboarding.basics.cm")}
        />
        <NumberRow
          label={t("onboarding.basics.weight")}
          value={weight}
          onChangeText={setWeight}
          suffix={t("onboarding.basics.kg")}
        />
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
        paddingVertical: space[4],
        alignItems: "center",
        gap: space[2],
        opacity: pressed ? 0.85 : 1,
      }}
    >
      <Text style={{ color: colors.textHi, fontSize: 22 }}>{symbol}</Text>
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

function NumberRow({
  label,
  value,
  onChangeText,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  suffix?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
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
          color: colors.textHi,
          fontSize: 16,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[1] }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={colors.textLo}
          style={{
            fontFamily: fonts.display,
            color: colors.textHi,
            fontSize: 22,
            minWidth: 48,
            textAlign: "right",
          }}
        />
        {suffix ? (
          <Text style={[typography.bodyMuted, { fontSize: 13 }]}>{suffix}</Text>
        ) : null}
      </View>
    </View>
  );
}
