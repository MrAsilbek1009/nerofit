import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Plus, Star, Trash2, X } from "lucide-react-native";
import { Button, Chip } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import {
  useAddFavorite,
  useDeleteUserMeal,
  useFavorites,
  useLogManualMeal,
  useLogMeal,
  useMeals,
  useRecentFoods,
  useRemoveFavorite,
  useUserMeals,
} from "@/lib/queries/nutrition";
import type { MealSlot } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

type PickerTab = "fast" | "catalog" | "myMeals";

// Denormalized macros shared by favorites / recents / saved meals rows.
type FastEntry = {
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

/**
 * "Log food" hub (Cal AI reference: docs/cal-ai-flow-study.md §5). Three tabs:
 * fast (quick-add kcal + favorites + recents, the 2–3-tap path), the meal
 * catalog, and the user's saved meal combos from the meal builder.
 */
export default function MealPickerScreen() {
  const params = useLocalSearchParams<{ slot?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();

  const meals = useMeals();
  const logMeal = useLogMeal(userId);
  const logManual = useLogManualMeal(userId);
  const recents = useRecentFoods(userId);
  const favorites = useFavorites(userId);
  const addFavorite = useAddFavorite(userId);
  const removeFavorite = useRemoveFavorite(userId);
  const userMeals = useUserMeals(userId);
  const deleteUserMeal = useDeleteUserMeal(userId);

  const [tab, setTab] = useState<PickerTab>("fast");

  const slot: MealSlot = SLOTS.includes(params.slot as MealSlot)
    ? (params.slot as MealSlot)
    : "snack";

  const saving = logMeal.isPending || logManual.isPending;

  function logEntry(entry: FastEntry) {
    if (saving) return;
    logManual.mutate({ ...entry, slot }, { onSuccess: () => router.back() });
  }

  function onPickCatalog(mealId: string) {
    const meal = meals.data?.find((m) => m.id === mealId);
    if (!meal || saving) return;
    logMeal.mutate({ meal, slot }, { onSuccess: () => router.back() });
  }

  const favoriteNames = new Set(
    (favorites.data ?? []).map((f) => f.name.trim().toLowerCase()),
  );

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
        <Text style={typography.labelCaps}>
          {t("nutrition.addToSlot", { slot: t(`nutrition.slots.${slot}`) })}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("a11y.close")}>
          <X size={24} color={colors.textHi} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", gap: space[2], paddingHorizontal: space[5], paddingBottom: space[3] }}>
        {(["fast", "catalog", "myMeals"] as const).map((tb) => (
          <Chip
            key={tb}
            label={t(`nutrition.fastLog.tabs.${tb}`)}
            selected={tab === tb}
            onPress={() => setTab(tb)}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space[5], paddingTop: space[2], gap: space[5] }}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "fast" ? (
          <FastTab
            loading={recents.isLoading || favorites.isLoading}
            error={recents.isError && favorites.isError}
            favorites={favorites.data ?? []}
            recents={(recents.data ?? []).filter(
              (r) => !favoriteNames.has(r.name.trim().toLowerCase()),
            )}
            saving={saving}
            onLog={logEntry}
            onFavorite={(entry) => addFavorite.mutate(entry)}
            onUnfavorite={(id) => removeFavorite.mutate(id)}
          />
        ) : null}

        {tab === "catalog" ? (
          <CatalogTab
            loading={meals.isLoading}
            meals={meals.data ?? []}
            onPick={onPickCatalog}
          />
        ) : null}

        {tab === "myMeals" ? (
          <MyMealsTab
            loading={userMeals.isLoading}
            meals={userMeals.data ?? []}
            saving={saving}
            onLog={logEntry}
            onDelete={(id) => deleteUserMeal.mutate(id)}
            onCreate={() => router.push("/meal-builder")}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Fast tab: quick add + favorites + recents ----

function FastTab({
  loading,
  error,
  favorites,
  recents,
  saving,
  onLog,
  onFavorite,
  onUnfavorite,
}: {
  loading: boolean;
  error: boolean;
  favorites: { id: string; name: string; kcal: number; protein_g: number; carbs_g: number; fats_g: number }[];
  recents: FastEntry[];
  saving: boolean;
  onLog: (entry: FastEntry) => void;
  onFavorite: (entry: FastEntry) => void;
  onUnfavorite: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={{ gap: space[5] }}>
      <QuickAdd saving={saving} onLog={onLog} />

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <Text style={typography.bodyMuted}>{t("common.error")}</Text>
      ) : favorites.length === 0 && recents.length === 0 ? (
        <Text style={[typography.bodyMuted, { fontStyle: "italic" }]}>
          {t("nutrition.fastLog.emptyFast")}
        </Text>
      ) : (
        <>
          {favorites.length > 0 ? (
            <View style={{ gap: space[3] }}>
              <Text style={typography.labelCaps}>{t("nutrition.fastLog.favorites")}</Text>
              {favorites.map((f) => (
                <FoodRow
                  key={f.id}
                  entry={f}
                  starred
                  disabled={saving}
                  onPress={() => onLog(f)}
                  onStar={() => onUnfavorite(f.id)}
                />
              ))}
            </View>
          ) : null}

          {recents.length > 0 ? (
            <View style={{ gap: space[3] }}>
              <Text style={typography.labelCaps}>{t("nutrition.fastLog.recent")}</Text>
              {recents.map((r) => (
                <FoodRow
                  key={r.name}
                  entry={r}
                  starred={false}
                  disabled={saving}
                  onPress={() => onLog(r)}
                  onStar={() => onFavorite(r)}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

// One-tap loggable row with a star toggle (recent → favorite, Cal AI
// "Suggestions" pattern).
function FoodRow({
  entry,
  starred,
  disabled,
  onPress,
  onStar,
}: {
  entry: FastEntry;
  starred: boolean;
  disabled: boolean;
  onPress: () => void;
  onStar: () => void;
}) {
  const { t } = useTranslation();
  const g = t("nutrition.g").toUpperCase();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={{ flex: 1, gap: 2, opacity: disabled ? 0.6 : 1 }}
      >
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={[typography.labelCaps, { fontSize: 10 }]}>
          {entry.kcal} {t("nutrition.kcal").toUpperCase()} · {entry.protein_g}
          {g} P
        </Text>
      </Pressable>
      <Pressable
        onPress={onStar}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t(
          starred ? "nutrition.fastLog.removeFavoriteA11y" : "nutrition.fastLog.saveFavoriteA11y",
        )}
      >
        <Star
          size={18}
          color={starred ? colors.textHi : colors.textLo}
          fill={starred ? colors.textHi : "transparent"}
        />
      </Pressable>
    </View>
  );
}

// Quick add: kcal required, everything else optional (Cal AI custom-food rule).
function QuickAdd({
  saving,
  onLog,
}: {
  saving: boolean;
  onLog: (entry: FastEntry) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");

  const kcalNum = parseInt(kcal, 10);
  const valid = Number.isFinite(kcalNum) && kcalNum > 0;

  function submit() {
    if (!valid) return;
    onLog({
      name: name.trim() || t("nutrition.fastLog.quickAddName"),
      kcal: kcalNum,
      protein_g: parseInt(protein, 10) || 0,
      carbs_g: parseInt(carbs, 10) || 0,
      fats_g: parseInt(fats, 10) || 0,
    });
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={18} color={colors.textHi} />
        </View>
        <View style={{ gap: 2 }}>
          <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }}>
            {t("nutrition.fastLog.quickAdd")}
          </Text>
          <Text style={[typography.labelCaps, { fontSize: 10 }]}>
            {t("nutrition.fastLog.quickAddHint")}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: space[3] }}>
      <Text style={typography.labelCaps}>{t("nutrition.fastLog.quickAdd")}</Text>
      <View style={{ flexDirection: "row", gap: space[2] }}>
        <QuickField
          value={kcal}
          onChange={setKcal}
          placeholder={t("nutrition.kcal")}
          flex={1.2}
        />
        <QuickField value={protein} onChange={setProtein} placeholder="P" />
        <QuickField value={carbs} onChange={setCarbs} placeholder="C" />
        <QuickField value={fats} onChange={setFats} placeholder="F" />
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("nutrition.fastLog.namePlaceholder")}
        placeholderTextColor={colors.textLo}
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
      <Button
        label={t("nutrition.fastLog.add")}
        loading={saving}
        disabled={!valid}
        onPress={submit}
      />
    </View>
  );
}

function QuickField({
  value,
  onChange,
  placeholder,
  flex = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  flex?: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textLo}
      keyboardType="number-pad"
      maxLength={4}
      style={{
        flex,
        fontFamily: fonts.body,
        color: colors.textHi,
        fontSize: 15,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.sm,
        paddingHorizontal: space[3],
        paddingVertical: space[2],
        textAlign: "center",
      }}
    />
  );
}

// ---- Catalog tab (the pre-N2 picker list) ----

function CatalogTab({
  loading,
  meals,
  onPick,
}: {
  loading: boolean;
  meals: { id: string; name: string; kcal: number; protein_g: number; image_url: string | null }[];
  onPick: (id: string) => void;
}) {
  const { t } = useTranslation();

  if (loading) return <ActivityIndicator color={colors.accent} />;
  if (meals.length === 0) {
    return (
      <Text style={[typography.bodyMuted, { textAlign: "center", paddingTop: space[6] }]}>
        {t("nutrition.emptyMeals")}
      </Text>
    );
  }

  return (
    <View style={{ gap: space[3] }}>
      {meals.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onPick(item.id)}
          accessibilityRole="button"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space[3],
            backgroundColor: colors.elevated,
            borderRadius: radii.md,
            padding: space[3],
          }}
        >
          <View style={{ width: 52, height: 52, borderRadius: radii.sm, overflow: "hidden", backgroundColor: colors.surface }}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={{ width: "100%", height: "100%" }} />
            ) : null}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }}>
              {item.name}
            </Text>
            <Text style={[typography.labelCaps, { fontSize: 10 }]}>
              {item.kcal} {t("nutrition.kcal").toUpperCase()} · {item.protein_g}
              {t("nutrition.g").toUpperCase()} P
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

// ---- My meals tab (saved combos from the meal builder) ----

function MyMealsTab({
  loading,
  meals,
  saving,
  onLog,
  onDelete,
  onCreate,
}: {
  loading: boolean;
  meals: { id: string; name: string; kcal: number; protein_g: number; carbs_g: number; fats_g: number; items: { name: string }[] }[];
  saving: boolean;
  onLog: (entry: FastEntry) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={{ gap: space[4] }}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : meals.length === 0 ? (
        <Text style={[typography.bodyMuted, { fontStyle: "italic" }]}>
          {t("nutrition.fastLog.myMealsEmpty")}
        </Text>
      ) : (
        <View style={{ gap: space[3] }}>
          {meals.map((m) => (
            <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
              <Pressable
                onPress={() => onLog(m)}
                disabled={saving}
                accessibilityRole="button"
                style={{ flex: 1, gap: 2, opacity: saving ? 0.6 : 1 }}
              >
                <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }} numberOfLines={1}>
                  {m.name}
                </Text>
                <Text style={[typography.labelCaps, { fontSize: 10 }]}>
                  {m.kcal} {t("nutrition.kcal").toUpperCase()} ·{" "}
                  {t("nutrition.fastLog.itemCount", { count: m.items.length })}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onDelete(m.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t("nutrition.fastLog.deleteMealA11y")}
              >
                <Trash2 size={18} color={colors.textLo} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Button
        label={t("nutrition.fastLog.createMeal")}
        variant="secondary"
        onPress={onCreate}
      />
    </View>
  );
}
