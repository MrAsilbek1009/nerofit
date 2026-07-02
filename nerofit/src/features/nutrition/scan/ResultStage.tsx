import { useState } from "react";
import { Image, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Chip } from "@/components/ui";
import type { FoodScanResult } from "@/lib/api/foodScan";
import type { MealSlot } from "@/types/db";
import { colors, fonts, space, typography } from "@/theme";
import { CloseButton } from "./CloseButton";
import { defaultSlot, SLOTS } from "./scanUtils";
import { Stepper } from "./Stepper";

// The meal logged from the editor — matches useLogScannedMeal's entry shape.
export type ScanLogEntry = {
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  slot: MealSlot;
};

// Editable estimate shown after photo / barcode / search. The user tweaks the
// name, servings, and slot, then logs it. Shared across all three input modes.
export function ResultStage({
  previewUri,
  result,
  saving,
  insetTop,
  insetBottom,
  onClose,
  onRetake,
  onAdd,
}: {
  previewUri: string | null;
  result: FoodScanResult;
  saving: boolean;
  insetTop: number;
  insetBottom: number;
  onClose: () => void;
  onRetake: () => void;
  onAdd: (entry: ScanLogEntry) => void;
}) {
  const { t } = useTranslation();
  const defaultName = result.items[0]?.name || t("nutrition.scan.defaultName");
  const [name, setName] = useState(defaultName);
  const [servings, setServings] = useState(1);
  const [slot, setSlot] = useState<MealSlot>(defaultSlot());

  const scaled = (n: number) => Math.round((n || 0) * servings);
  const total = result.total;
  const g = t("nutrition.g").toUpperCase();

  const confidenceLabel = t(`nutrition.scan.confidence.${result.confidence}`);

  function submit() {
    onAdd({
      name: name.trim() || defaultName,
      kcal: scaled(total.kcal),
      protein_g: scaled(total.protein_g),
      carbs_g: scaled(total.carbs_g),
      fats_g: scaled(total.fats_g),
      slot,
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insetBottom + space[5] }}>
        <View>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={{ width: "100%", height: 300 }} resizeMode="cover" />
          ) : (
            <View style={{ width: "100%", height: 300, backgroundColor: colors.elevated }} />
          )}
          <CloseButton top={insetTop} onPress={onClose} />
        </View>

        <View style={{ padding: space[5], gap: space[5] }}>
          {/* Estimate + confidence */}
          <View style={{ gap: space[1] }}>
            <Text style={typography.labelCaps}>
              {t("nutrition.scan.estimate")} · {confidenceLabel}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("nutrition.scan.mealNamePlaceholder")}
              placeholderTextColor={colors.textLo}
              style={{
                fontFamily: fonts.display,
                color: colors.textHi,
                fontSize: 28,
                paddingVertical: space[1],
              }}
            />
          </View>

          {/* Calories + macros */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 44 }}>
                {scaled(total.kcal)}
              </Text>
              <Text style={typography.labelCaps}>{t("nutrition.kcal").toUpperCase()}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: space[5] }}>
              <MacroStat label={t("nutrition.protein")} value={`${scaled(total.protein_g)}${g}`} />
              <MacroStat label={t("nutrition.carbs")} value={`${scaled(total.carbs_g)}${g}`} />
              <MacroStat label={t("nutrition.fats")} value={`${scaled(total.fats_g)}${g}`} />
            </View>
          </View>

          {/* Servings */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={[typography.labelCaps, { color: colors.textHi }]}>
              {t("nutrition.scan.servings")}
            </Text>
            <Stepper value={servings} onChange={setServings} format={(v) => String(v)} />
          </View>

          {/* Detected items */}
          {result.items.length > 0 ? (
            <View style={{ gap: space[3] }}>
              <Text style={typography.labelCaps}>{t("nutrition.scan.detected")}</Text>
              {result.items.map((item, i) => (
                <View
                  key={`${item.name}-${i}`}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[3] }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.portion ? <Text style={typography.bodyMuted}>{item.portion}</Text> : null}
                  </View>
                  <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 13 }}>
                    {scaled(item.kcal)} {t("nutrition.kcal").toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Slot */}
          <View style={{ gap: space[3] }}>
            <Text style={typography.labelCaps}>{t("nutrition.scan.addToMeal")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[2] }}>
              {SLOTS.map((s) => (
                <Chip
                  key={s}
                  label={t(`nutrition.slots.${s}`)}
                  selected={slot === s}
                  onPress={() => setSlot(s)}
                />
              ))}
            </View>
          </View>

          {result.notes ? (
            <Text style={[typography.bodyMuted, { fontStyle: "italic" }]}>{result.notes}</Text>
          ) : null}

          {/* Actions */}
          <View style={{ gap: space[3], marginTop: space[2] }}>
            <Button label={t("nutrition.scan.addToLog")} loading={saving} onPress={submit} />
            <Button label={t("nutrition.scan.retake")} variant="secondary" onPress={onRetake} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MacroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "flex-end", gap: 2 }}>
      <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 15 }}>{value}</Text>
      <Text style={[typography.labelCaps, { fontSize: 10 }]}>{label}</Text>
    </View>
  );
}
