import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { BodyMap } from "@/features/workouts/components/BodyMap";
import { useGeneratorDraft } from "@/store/generatorDraft";
import type {
  GeneratorDifficulty,
  GeneratorEquipment,
  GeneratorFocus,
  GeneratorTarget,
} from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

const TIMES = [10, 15, 20, 30, 45, 60];
const TARGETS: GeneratorTarget[] = ["upper", "lower", "core", "push", "pull", "full"];
const FOCUSES: GeneratorFocus[] = ["strength", "muscle", "endurance"];
const DIFFICULTIES: GeneratorDifficulty[] = ["beginner", "intermediate", "advanced"];
const EQUIPMENTS: GeneratorEquipment[] = ["none", "dumbbells", "your", "all_gym"];

export default function WorkoutGeneratorScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useGeneratorDraft((s) => s.params);
  const setParams = useGeneratorDraft((s) => s.setParams);

  const [timeMin, setTimeMin] = useState(draft.timeMin);
  const [target, setTarget] = useState<GeneratorTarget>(draft.target);
  const [focus, setFocus] = useState<GeneratorFocus>(draft.focus);
  const [difficulty, setDifficulty] = useState<GeneratorDifficulty>(draft.difficulty);
  const [equipment, setEquipment] = useState<GeneratorEquipment>(draft.equipment);
  const [warmup, setWarmup] = useState(draft.warmup);
  const [stretch, setStretch] = useState(draft.stretch);

  function save() {
    setParams({ timeMin, target, focus, difficulty, equipment, warmup, stretch });
    router.replace("/custom-workout");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top", "bottom"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: space[5],
          paddingVertical: space[3],
        }}
      >
        <Text style={typography.h2}>{t("generator.title")}</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          style={{ position: "absolute", left: space[5] }}
        >
          <Text style={[typography.labelCaps, { color: colors.textLo }]}>{t("generator.cancel")}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[7], gap: space[6] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Time */}
        <Section title={t("generator.workoutTime")}>
          <Wrap>
            {TIMES.map((m) => (
              <Chip key={m} label={`${m} ${t("workouts.minShort")}`} selected={timeMin === m} onPress={() => setTimeMin(m)} />
            ))}
          </Wrap>
        </Section>

        {/* Target muscles + body map */}
        <Section title={t("generator.targetMuscles")}>
          <Wrap>
            {TARGETS.map((tg) => (
              <Chip key={tg} label={t(`generator.targets.${tg}`)} selected={target === tg} onPress={() => setTarget(tg)} />
            ))}
          </Wrap>
          <View style={{ paddingTop: space[3] }}>
            <BodyMap target={target} />
          </View>
        </Section>

        {/* Focus */}
        <Section title={t("generator.focus")}>
          <Wrap>
            {FOCUSES.map((f) => (
              <Chip
                key={f}
                label={t(`generator.focuses.${f}`)}
                sub={t(`generator.focusReps.${f}`)}
                selected={focus === f}
                onPress={() => setFocus(f)}
              />
            ))}
          </Wrap>
        </Section>

        {/* Difficulty */}
        <Section title={t("generator.difficulty")}>
          <Wrap>
            {DIFFICULTIES.map((d) => (
              <Chip key={d} label={t(`generator.difficulties.${d}`)} selected={difficulty === d} onPress={() => setDifficulty(d)} />
            ))}
          </Wrap>
        </Section>

        {/* Equipment */}
        <Section title={t("generator.equipment")}>
          <Wrap>
            {EQUIPMENTS.map((e) => (
              <Chip key={e} label={t(`generator.equipments.${e}`)} selected={equipment === e} onPress={() => setEquipment(e)} />
            ))}
          </Wrap>
        </Section>

        {/* Toggles */}
        <View style={{ gap: space[4] }}>
          <ToggleRow label={t("generator.warmUp")} value={warmup} onChange={setWarmup} />
          <ToggleRow label={t("generator.stretching")} value={stretch} onChange={setStretch} />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[5] }}>
        <Pressable
          onPress={save}
          accessibilityRole="button"
          style={{
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent,
            borderRadius: radii.pill,
            paddingVertical: space[4],
          }}
        >
          <Text style={{ fontFamily: fonts.label, color: colors.canvas, fontSize: 15 }}>{t("generator.save")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space[3] }}>
      <Text style={typography.labelCaps}>{title}</Text>
      {children}
    </View>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[2] }}>{children}</View>;
}

function Chip({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        backgroundColor: selected ? colors.accent : colors.elevated,
        borderRadius: radii.sm,
        paddingHorizontal: space[4],
        paddingVertical: space[3],
        minWidth: "31%",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodyMed,
          fontSize: 13,
          color: selected ? colors.canvas : colors.textHi,
        }}
      >
        {label}
      </Text>
      {sub ? (
        <Text
          style={{
            fontFamily: fonts.label,
            fontSize: 9,
            color: selected ? colors.canvas : colors.textLo,
            marginTop: 2,
          }}
        >
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.textHi}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}
