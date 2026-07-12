import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, X } from "lucide-react-native";
import { Button } from "@/components/ui";
import { VerifiedBadge } from "@/features/nutrition/components/VerifiedBadge";
import { useUserId } from "@/hooks/useUser";
import {
  useCreateUserMeal,
  useFoodSearch,
  useRecentFoods,
} from "@/lib/queries/nutrition";
import type { UserMealItem } from "@/lib/api/userFoods";
import { sumMealItems } from "@/lib/nutrition/fastLog";
import { colors, fonts, radii, space, typography } from "@/theme";

/**
 * Meal builder (Cal AI "Creating a meal", docs/cal-ai-flow-study.md §5):
 * name the combo, add items from search (local foods + OpenFoodFacts) or
 * recents, watch the totals update live, save. Saved meals log in one tap
 * from the picker's "My meals" tab.
 */
export default function MealBuilderScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();

  const [name, setName] = useState("");
  const [items, setItems] = useState<UserMealItem[]>([]);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const search = useFoodSearch(debounced);
  const recents = useRecentFoods(userId);
  const create = useCreateUserMeal(userId);

  const totals = sumMealItems(items);
  const canSave = name.trim().length > 0 && items.length > 0;
  const g = t("nutrition.g").toUpperCase();

  function addItem(item: UserMealItem) {
    setItems((prev) => [...prev, item]);
    setQuery("");
  }

  function save() {
    if (!canSave) return;
    create.mutate(
      { name: name.trim(), items },
      { onSuccess: () => router.back() },
    );
  }

  const showSearch = debounced.trim().length >= 2;
  const suggestions = (recents.data ?? []).slice(0, 5);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: space[5],
          paddingVertical: space[3],
        }}
      >
        <Text style={typography.labelCaps}>{t("nutrition.fastLog.builder.title")}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("a11y.close")}>
          <X size={24} color={colors.textHi} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space[5], gap: space[5] }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("nutrition.fastLog.builder.namePlaceholder")}
          placeholderTextColor={colors.textLo}
          style={{
            fontFamily: fonts.display,
            color: colors.textHi,
            fontSize: 28,
            paddingVertical: space[1],
          }}
        />

        {/* Live totals */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 44 }}>
              {totals.kcal}
            </Text>
            <Text style={typography.labelCaps}>{t("nutrition.kcal").toUpperCase()}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: space[5] }}>
            <TotalStat label={t("nutrition.protein")} value={`${totals.protein_g}${g}`} />
            <TotalStat label={t("nutrition.carbs")} value={`${totals.carbs_g}${g}`} />
            <TotalStat label={t("nutrition.fats")} value={`${totals.fats_g}${g}`} />
          </View>
        </View>

        {/* Items */}
        <View style={{ gap: space[3] }}>
          <Text style={typography.labelCaps}>{t("nutrition.fastLog.builder.items")}</Text>
          {items.length === 0 ? (
            <Text style={[typography.bodyMuted, { fontStyle: "italic" }]}>
              {t("nutrition.fastLog.builder.empty")}
            </Text>
          ) : (
            items.map((item, i) => (
              <View
                key={`${item.name}-${i}`}
                style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[typography.labelCaps, { fontSize: 10 }]}>
                    {item.kcal} {t("nutrition.kcal").toUpperCase()}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t("nutrition.fastLog.builder.removeItemA11y")}
                >
                  <Trash2 size={18} color={colors.textLo} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Add items: search (local + OFF), or recents when idle */}
        <View style={{ gap: space[3] }}>
          <Text style={typography.labelCaps}>{t("nutrition.fastLog.builder.addItems")}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("nutrition.fastLog.builder.searchPlaceholder")}
            placeholderTextColor={colors.textLo}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              fontFamily: fonts.body,
              color: colors.textHi,
              fontSize: 15,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.sm,
              paddingHorizontal: space[3],
              paddingVertical: space[2],
            }}
          />

          {showSearch ? (
            search.isLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : search.isError ? (
              <Text style={typography.bodyMuted}>{t("common.error")}</Text>
            ) : (search.data ?? []).length === 0 ? (
              <Text style={typography.bodyMuted}>{t("nutrition.scan.search.empty")}</Text>
            ) : (
              (search.data ?? []).slice(0, 8).map((hit) => (
                <AddRow
                  key={`${hit.code}-${hit.name}`}
                  name={hit.brand ? `${hit.name} · ${hit.brand}` : hit.name}
                  kcal={hit.kcal}
                  verified={hit.verified}
                  onAdd={() =>
                    addItem({
                      name: hit.brand ? `${hit.name} · ${hit.brand}` : hit.name,
                      kcal: hit.kcal,
                      protein_g: hit.protein_g,
                      carbs_g: hit.carbs_g,
                      fats_g: hit.fats_g,
                    })
                  }
                />
              ))
            )
          ) : suggestions.length > 0 ? (
            <>
              <Text style={[typography.labelCaps, { fontSize: 10 }]}>
                {t("nutrition.fastLog.recent")}
              </Text>
              {suggestions.map((r) => (
                <AddRow key={r.name} name={r.name} kcal={r.kcal} onAdd={() => addItem(r)} />
              ))}
            </>
          ) : null}
        </View>

        <Button
          label={t("nutrition.fastLog.builder.save")}
          loading={create.isPending}
          disabled={!canSave}
          onPress={save}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function AddRow({
  name,
  kcal,
  verified,
  onAdd,
}: {
  name: string;
  kcal: number;
  verified?: boolean;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onAdd}
      accessibilityRole="button"
      style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}
    >
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <Text
          style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15, flexShrink: 1 }}
          numberOfLines={1}
        >
          {name}
        </Text>
        {verified ? <VerifiedBadge /> : null}
      </View>
      <Text style={[typography.labelCaps, { fontSize: 10 }]}>
        {kcal} {t("nutrition.kcal").toUpperCase()}
      </Text>
      <Plus size={18} color={colors.textHi} />
    </Pressable>
  );
}

function TotalStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "flex-end", gap: 2 }}>
      <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 15 }}>{value}</Text>
      <Text style={[typography.labelCaps, { fontSize: 10 }]}>{label}</Text>
    </View>
  );
}
