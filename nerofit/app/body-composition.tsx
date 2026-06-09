import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { useAddBodyMetric, useLatestBodyMetric } from "@/lib/queries/bodyMetrics";
import { noWebOutline } from "@/lib/style";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function BodyCompositionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();
  const latest = useLatestBodyMetric(userId);
  const addMetric = useAddBodyMetric(userId);

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");

  const heightRef = useRef<TextInput>(null);
  const bodyFatRef = useRef<TextInput>(null);

  const weightNum = Number.parseFloat(weight);
  const heightNum = Number.parseFloat(height);
  const bodyFatNum = Number.parseFloat(bodyFat);
  const canSave =
    Number.isFinite(weightNum) ||
    Number.isFinite(heightNum) ||
    Number.isFinite(bodyFatNum);

  const prev = latest.data;

  function onSave() {
    if (!canSave) return;
    addMetric.mutate(
      {
        weight_kg: Number.isFinite(weightNum) ? weightNum : (prev?.weight_kg ?? null),
        height_cm: Number.isFinite(heightNum) ? heightNum : (prev?.height_cm ?? null),
        body_fat_pct: Number.isFinite(bodyFatNum)
          ? bodyFatNum
          : (prev?.body_fat_pct ?? null),
      },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space[3],
          paddingHorizontal: space[5],
          paddingVertical: space[3],
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <ArrowLeft size={24} color={colors.textHi} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space[5],
          paddingBottom: space[5],
          gap: space[5],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: space[2] }}>
          <Text style={[typography.display, { fontSize: 32, textTransform: "uppercase" }]}>
            {t("bodyComp.title")}
          </Text>
          <Text style={typography.bodyMuted}>{t("bodyComp.subtitle")}</Text>
        </View>

        <View style={{ gap: space[3] }}>
          <MetricInput
            label={t("bodyComp.weight")}
            value={weight}
            onChangeText={setWeight}
            suffix={t("bodyComp.kg")}
            placeholder={prev?.weight_kg != null ? String(prev.weight_kg) : "—"}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => heightRef.current?.focus()}
          />
          <MetricInput
            label={t("bodyComp.height")}
            value={height}
            onChangeText={setHeight}
            suffix={t("bodyComp.cm")}
            placeholder={prev?.height_cm != null ? String(prev.height_cm) : "—"}
            inputRef={heightRef}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => bodyFatRef.current?.focus()}
          />
          <MetricInput
            label={t("bodyComp.bodyFat")}
            value={bodyFat}
            onChangeText={setBodyFat}
            suffix={t("bodyComp.pct")}
            placeholder={prev?.body_fat_pct != null ? String(prev.body_fat_pct) : "—"}
            inputRef={bodyFatRef}
            returnKeyType="done"
          />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: space[5], paddingBottom: space[5] }}>
        <Button
          label={t("bodyComp.save")}
          onPress={onSave}
          disabled={!canSave}
          loading={addMetric.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

function MetricInput({
  label,
  value,
  onChangeText,
  suffix,
  placeholder,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  submitBehavior,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  suffix?: string;
  placeholder?: string;
  inputRef?: React.RefObject<TextInput | null>;
  returnKeyType?: "next" | "done";
  onSubmitEditing?: () => void;
  submitBehavior?: "submit" | "blurAndSubmit";
}) {
  const internalRef = useRef<TextInput>(null);
  const ref = inputRef ?? internalRef;
  return (
    <Pressable
      onPress={() => ref.current?.focus()}
      accessibilityRole="button"
      style={{
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        paddingHorizontal: space[4],
        paddingVertical: space[4],
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[1] }}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder={placeholder ?? "—"}
          placeholderTextColor={colors.textLo}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          submitBehavior={submitBehavior}
          style={[
            {
              fontFamily: fonts.display,
              color: colors.textHi,
              fontSize: 28,
              minWidth: 56,
              textAlign: "right",
              paddingVertical: 0,
            },
            noWebOutline,
          ]}
        />
        {suffix ? (
          <Text style={[typography.bodyMuted, { fontSize: 13 }]}>{suffix}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
