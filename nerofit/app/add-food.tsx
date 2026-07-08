import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import { Button } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { useSubmitFood } from "@/lib/queries/nutrition";
import {
  validateFoodInput,
  type FoodInputErrors,
  type FoodInputField,
  type FoodInputRaw,
} from "@/lib/nutrition/foodInput";
import { colors, fonts, radii, space, typography } from "@/theme";

const EMPTY: FoodInputRaw = {
  name: "",
  brand: "",
  kcal: "",
  protein_g: "",
  carbs_g: "",
  fats_g: "",
  serving_label: "",
  serving_grams: "",
  barcode: "",
};

// Crowdsource: submit a community food (goes to the regional DB, usable now,
// public once moderated). Contributes to the local-food "moat".
export default function AddFoodScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();
  const submit = useSubmitFood(userId);

  const [form, setForm] = useState<FoodInputRaw>(EMPTY);
  const [errors, setErrors] = useState<FoodInputErrors>({});

  function set(field: FoodInputField, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function onSubmit() {
    const res = validateFoodInput(form);
    if (!res.ok) {
      setErrors(res.errors);
      return;
    }
    setErrors({});
    submit.mutate(res.value, {
      onSuccess: () => {
        Alert.alert(t("nutrition.foods.submittedTitle"), t("nutrition.foods.submittedBody"));
        router.back();
      },
      onError: () => {
        Alert.alert(t("common.error"), t("nutrition.foods.submitError"));
      },
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
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
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.close")}
          style={{ position: "absolute", left: space[5] }}
        >
          <X size={24} color={colors.textHi} />
        </Pressable>
        <Text style={typography.h2}>{t("nutrition.foods.addFood")}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: space[5], gap: space[4], paddingBottom: space[7] }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={typography.bodyMuted}>{t("nutrition.foods.addHint")}</Text>

          <Field
            label={t("nutrition.foods.fields.name")}
            value={form.name}
            onChangeText={(v) => set("name", v)}
            error={errors.name}
            autoFocus
          />
          <Field
            label={t("nutrition.foods.fields.brand")}
            value={form.brand}
            onChangeText={(v) => set("brand", v)}
          />
          <Field
            label={t("nutrition.foods.fields.serving")}
            value={form.serving_label}
            onChangeText={(v) => set("serving_label", v)}
            placeholder={t("nutrition.foods.servingPlaceholder")}
          />

          <View style={{ flexDirection: "row", gap: space[3] }}>
            <View style={{ flex: 1 }}>
              <Field
                label={t("nutrition.kcal").toUpperCase()}
                value={form.kcal}
                onChangeText={(v) => set("kcal", v)}
                error={errors.kcal}
                numeric
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t("nutrition.foods.fields.grams")}
                value={form.serving_grams}
                onChangeText={(v) => set("serving_grams", v)}
                error={errors.serving_grams}
                numeric
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: space[3] }}>
            <View style={{ flex: 1 }}>
              <Field
                label={t("nutrition.protein")}
                value={form.protein_g}
                onChangeText={(v) => set("protein_g", v)}
                error={errors.protein_g}
                numeric
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t("nutrition.carbs")}
                value={form.carbs_g}
                onChangeText={(v) => set("carbs_g", v)}
                error={errors.carbs_g}
                numeric
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t("nutrition.fats")}
                value={form.fats_g}
                onChangeText={(v) => set("fats_g", v)}
                error={errors.fats_g}
                numeric
              />
            </View>
          </View>

          <View style={{ marginTop: space[2] }}>
            <Button
              label={t("nutrition.foods.submit")}
              loading={submit.isPending}
              onPress={onSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  error,
  numeric,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  numeric?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <View style={{ gap: space[1] }}>
      <Text style={typography.labelCaps}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLo}
        autoFocus={autoFocus}
        keyboardType={numeric ? "numeric" : "default"}
        style={{
          fontFamily: fonts.body,
          color: colors.textHi,
          fontSize: 16,
          backgroundColor: colors.elevated,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : "transparent",
          paddingHorizontal: space[4],
          paddingVertical: space[3],
        }}
      />
    </View>
  );
}
