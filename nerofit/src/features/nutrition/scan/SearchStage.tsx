import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Search as SearchIcon } from "lucide-react-native";
import type { FoodScanResult } from "@/lib/api/foodScan";
import { foodScanResultFromHit, type FoodSearchHit } from "@/lib/nutrition/offParse";
import { useFoodSearch } from "@/lib/queries/nutrition";
import { track } from "@/lib/analytics";
import { colors, fonts, radii, space, typography } from "@/theme";

// Ingredient/product search via OpenFoodFacts. Picking a hit produces a
// FoodScanResult that flows into the shared result editor.
export function SearchStage({ onPick }: { onPick: (result: FoodScanResult) => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce the query string (UI state, not a fetch) so we don't hit OFF on
  // every keystroke. The fetch itself lives in useFoodSearch, keyed on this.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);

  const search = useFoodSearch(debounced);
  const hits = search.data ?? [];
  const tooShort = debounced.length < 2;

  function pick(hit: FoodSearchHit) {
    track("food_search_selected", { has_brand: !!hit.brand });
    onPick(foodScanResultFromHit(hit));
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: space[5], gap: space[4] }}>
      {/* Search box */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space[2],
          backgroundColor: colors.elevated,
          borderRadius: radii.md,
          paddingHorizontal: space[4],
        }}
      >
        <SearchIcon size={18} color={colors.textLo} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("nutrition.scan.search.placeholder")}
          placeholderTextColor={colors.textLo}
          autoFocus
          returnKeyType="search"
          style={{
            flex: 1,
            fontFamily: fonts.body,
            color: colors.textHi,
            fontSize: 16,
            paddingVertical: space[3],
          }}
        />
      </View>

      {/* Results / states */}
      {tooShort ? (
        <Centered text={t("nutrition.scan.search.hint")} />
      ) : search.isLoading ? (
        <View style={{ paddingTop: space[6], alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : search.isError ? (
        <Centered text={t("nutrition.scan.errorBody")} />
      ) : hits.length === 0 ? (
        <Centered text={t("nutrition.scan.search.empty")} />
      ) : (
        <FlatList
          data={hits}
          keyExtractor={(h, i) => `${h.code || h.name}-${i}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: space[2], paddingBottom: space[6] }}
          ListFooterComponent={
            <Text style={[typography.bodyMuted, { textAlign: "center", marginTop: space[4], fontSize: 11 }]}>
              {t("nutrition.scan.search.poweredByOff")}
            </Text>
          }
          renderItem={({ item }) => <HitRow hit={item} onPress={() => pick(item)} />}
        />
      )}
    </View>
  );
}

function HitRow({ hit, onPress }: { hit: FoodSearchHit; onPress: () => void }) {
  const { t } = useTranslation();
  const subtitle = [hit.brand, hit.portion].filter(Boolean).join(" · ");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: space[3],
        paddingVertical: space[3],
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }} numberOfLines={1}>
          {hit.name}
        </Text>
        {subtitle ? (
          <Text style={typography.bodyMuted} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 13 }}>
        {hit.kcal} {t("nutrition.kcal").toUpperCase()}
      </Text>
    </Pressable>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <View style={{ paddingTop: space[6], paddingHorizontal: space[4] }}>
      <Text style={[typography.bodyMuted, { textAlign: "center" }]}>{text}</Text>
    </View>
  );
}
