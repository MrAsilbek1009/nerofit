import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Chip } from "@/components/ui";
import { ChoiceImageCard } from "@/features/onboarding/components/ChoiceImageCard";
import { StepShell } from "@/features/onboarding/components/StepShell";
import { EQUIPMENT_IMAGES } from "@/features/onboarding/images";
import { useOnboardingStore } from "@/features/onboarding/store";
import {
  EQUIPMENT_VALUES,
  INJURY_VALUES,
  equipmentSchema,
} from "@/features/onboarding/schema";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function EquipmentStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const setEquipment = useOnboardingStore((s) => s.setEquipment);

  const [equipment, setEquipmentValue] = useState<
    (typeof EQUIPMENT_VALUES)[number] | undefined
  >(draft.equipment);
  const [injuries, setInjuries] = useState<(typeof INJURY_VALUES)[number][]>(
    draft.injuries ?? [],
  );
  const [notes, setNotes] = useState<string>(draft.notes ?? "");

  const parsed = equipmentSchema.safeParse({
    equipment,
    injuries,
    notes: notes || undefined,
  });

  function toggleInjury(value: (typeof INJURY_VALUES)[number]) {
    setInjuries((curr) =>
      curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value],
    );
  }

  function onContinue() {
    if (!parsed.success) return;
    setEquipment(parsed.data);
    router.push("/(auth)/onboarding/building");
  }

  return (
    <StepShell
      step={3}
      total={4}
      title={t("onboarding.equipment.title")}
      subtitle={t("onboarding.equipment.subtitle")}
      ctaDisabled={!parsed.success}
      onContinue={onContinue}
    >
      {/* Equipment access */}
      <View style={{ gap: space[3] }}>
        <Text style={typography.labelCaps}>
          {t("onboarding.equipment.accessLabel")}
        </Text>
        <View style={{ gap: space[3] }}>
          {EQUIPMENT_VALUES.map((value) => {
            const selected = equipment === value;
            return (
              <ChoiceImageCard
                key={value}
                imageUri={EQUIPMENT_IMAGES[value]}
                tag={t(`onboarding.equipment.options.${value}.tag`)}
                title={t(`onboarding.equipment.options.${value}.title`)}
                selected={selected}
                onPress={() => setEquipmentValue(value)}
                height={110}
              />
            );
          })}
        </View>
      </View>

      {/* Injuries */}
      <View style={{ gap: space[3] }}>
        <Text style={typography.labelCaps}>
          {t("onboarding.equipment.injuriesLabel")}
        </Text>
        <Text style={typography.bodyMuted}>
          {t("onboarding.equipment.injuriesHint")}
        </Text>
        <View style={{ flexDirection: "row", gap: space[2], flexWrap: "wrap" }}>
          {INJURY_VALUES.map((value) => (
            <Chip
              key={value}
              label={t(`onboarding.equipment.injuries.${value}`)}
              selected={injuries.includes(value)}
              onPress={() => toggleInjury(value)}
            />
          ))}
        </View>
      </View>

      {/* Notes */}
      <View
        style={{
          backgroundColor: colors.elevated,
          borderRadius: radii.md,
          padding: space[4],
        }}
      >
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t("onboarding.equipment.notesPlaceholder")}
          placeholderTextColor={colors.textLo}
          multiline
          numberOfLines={3}
          style={{
            fontFamily: fonts.body,
            color: colors.textHi,
            fontSize: 14,
            minHeight: 60,
            textAlignVertical: "top",
          }}
        />
      </View>
    </StepShell>
  );
}
