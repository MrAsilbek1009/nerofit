import { useState } from "react";
import { Image, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Chip } from "@/components/ui";
import type { FoodScanResult } from "@/lib/api/foodScan";
import type { MealSlot } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";
import { CloseButton } from "./CloseButton";
import { GramSlider } from "./GramSlider";
import { amountFactor, type AmountUnit, defaultSlot, gramRange, SLOTS } from "./scanUtils";
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
// name, amount (servings or grams), and slot, then logs it. "Fix with AI" sends
// a text correction back through the Edge Function for a re-estimate.
export function ResultStage({
  previewUri,
  result,
  saving,
  insetTop,
  insetBottom,
  onClose,
  onRetake,
  onAdd,
  onFix,
}: {
  previewUri: string | null;
  result: FoodScanResult;
  saving: boolean;
  insetTop: number;
  insetBottom: number;
  onClose: () => void;
  onRetake: () => void;
  onAdd: (entry: ScanLogEntry) => void;
  // Optional: screens without a re-analysis flow (scan history) hide the button.
  onFix?: (hint: string) => void;
}) {
  const { t } = useTranslation();
  const defaultName = result.items[0]?.name || t("nutrition.scan.defaultName");
  const [name, setName] = useState(defaultName);
  const [servings, setServings] = useState(1);
  const [slot, setSlot] = useState<MealSlot>(defaultSlot());

  // Gram mode is only offered when the estimate carries a weight.
  const totalG = typeof result.total_g === "number" && result.total_g > 0 ? result.total_g : null;
  const [unit, setUnit] = useState<AmountUnit>("serving");
  const [grams, setGrams] = useState(totalG ?? 0);

  const [fixOpen, setFixOpen] = useState(false);
  const [fixText, setFixText] = useState("");

  const factor = amountFactor(unit, servings, grams, totalG);
  const scaled = (n: number) => Math.round((n || 0) * factor);
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

  function submitFix() {
    const hint = fixText.trim();
    if (!hint) return;
    onFix?.(hint);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insetBottom + space[5] }}
        keyboardShouldPersistTaps="handled"
      >
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

          {/* Amount: servings stepper, or gram slider when weight is known */}
          <View style={{ gap: space[3] }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={[typography.labelCaps, { color: colors.textHi }]}>
                {t("nutrition.scan.amount")}
              </Text>
              {totalG ? (
                <View style={{ flexDirection: "row", gap: space[2] }}>
                  <Chip
                    label={t("nutrition.scan.units.serving")}
                    selected={unit === "serving"}
                    onPress={() => setUnit("serving")}
                  />
                  <Chip
                    label={t("nutrition.scan.units.gram")}
                    selected={unit === "gram"}
                    onPress={() => setUnit("gram")}
                  />
                </View>
              ) : null}
            </View>

            {unit === "gram" && totalG ? (
              <View style={{ gap: space[2] }}>
                <GramSlider value={grams} onChange={setGrams} {...gramRange(totalG)} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={typography.bodyMuted}>
                    {t("nutrition.scan.estimatedWeight", { grams: totalG })}
                  </Text>
                  <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 20 }}>
                    {grams}
                    {g}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: "flex-end" }}>
                <Stepper value={servings} onChange={setServings} format={(v) => String(v)} />
              </View>
            )}
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

          {/* Fix with AI: describe what's wrong → re-estimate */}
          {onFix ? (
            <View style={{ gap: space[3] }}>
              {fixOpen ? (
                <View style={{ gap: space[3] }}>
                  <Text style={typography.labelCaps}>{t("nutrition.scan.fixWithAi")}</Text>
                  <TextInput
                    value={fixText}
                    onChangeText={setFixText}
                    placeholder={t("nutrition.scan.fixPlaceholder")}
                    placeholderTextColor={colors.textLo}
                    multiline
                    maxLength={300}
                    style={{
                      fontFamily: fonts.body,
                      color: colors.textHi,
                      fontSize: 15,
                      minHeight: 72,
                      textAlignVertical: "top",
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radii.md,
                      padding: space[3],
                    }}
                  />
                  <Button
                    label={t("nutrition.scan.fixSubmit")}
                    variant="secondary"
                    disabled={!fixText.trim()}
                    onPress={submitFix}
                  />
                </View>
              ) : (
                <Button
                  label={t("nutrition.scan.fixWithAi")}
                  variant="secondary"
                  onPress={() => setFixOpen(true)}
                />
              )}
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
