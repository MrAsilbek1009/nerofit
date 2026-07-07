import { useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Trash2, X } from "lucide-react-native";
import type { FoodScanRecord } from "@/lib/api/foodScan";
import { useUserId } from "@/hooks/useUser";
import {
  useDeleteFoodScan,
  useFoodScans,
  useLogScannedMeal,
} from "@/lib/queries/nutrition";
import { ResultStage } from "@/features/nutrition/scan/ResultStage";
import { scanTitle } from "@/features/nutrition/scan/scanUtils";
import { track } from "@/lib/analytics";
import { colors, fonts, space, typography } from "@/theme";

export default function ScanHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useUserId();

  const scans = useFoodScans(userId);
  const del = useDeleteFoodScan(userId);
  const logScanned = useLogScannedMeal(userId);

  const [selected, setSelected] = useState<FoodScanRecord | null>(null);

  // Re-log editor for a chosen past scan (reuses the shared scan result editor).
  if (selected) {
    return (
      <ResultStage
        previewUri={selected.photoUrl ?? null}
        result={selected.result}
        saving={logScanned.isPending}
        insetTop={insets.top + space[2]}
        insetBottom={insets.bottom + space[4]}
        onClose={() => setSelected(null)}
        onRetake={() => setSelected(null)}
        onAdd={(entry) => {
          track("scan_relogged", { slot: entry.slot });
          logScanned.mutate(entry, { onSuccess: () => setSelected(null) });
        }}
      />
    );
  }

  const records = scans.data ?? [];

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
        <Text style={typography.h2}>{t("nutrition.scanHistory.title")}</Text>
      </View>

      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: space[5], gap: space[2], flexGrow: 1 }}
        ListEmptyComponent={
          scans.isLoading ? (
            <View style={{ paddingTop: space[7], alignItems: "center" }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : scans.isError ? (
            <View style={{ paddingTop: space[7], alignItems: "center", gap: space[3] }}>
              <Text style={typography.bodyMuted}>{t("common.error")}</Text>
              <Pressable onPress={() => void scans.refetch()} accessibilityRole="button">
                <Text style={[typography.body, { color: colors.accent }]}>{t("common.retry")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ paddingTop: space[7], paddingHorizontal: space[4] }}>
              <Text style={[typography.bodyMuted, { textAlign: "center" }]}>
                {t("nutrition.scanHistory.empty")}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ScanRow
            record={item}
            onOpen={() => setSelected(item)}
            onDelete={() => del.mutate(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function ScanRow({
  record,
  onOpen,
  onDelete,
}: {
  record: FoodScanRecord;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const title = scanTitle(record.result, t("nutrition.scan.defaultName"));
  const date = new Date(record.created_at).toLocaleDateString();
  const confidence = t(`nutrition.scan.confidence.${record.result.confidence}`);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: space[3],
      }}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: space[3] }}
      >
        {record.photoUrl ? (
          <Image
            source={{ uri: record.photoUrl }}
            style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: colors.elevated }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={typography.bodyMuted} numberOfLines={1}>
            {date} · {confidence}
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 13 }}>
          {record.result.total.kcal} {t("nutrition.kcal").toUpperCase()}
        </Text>
      </Pressable>
      <Pressable
        onPress={onDelete}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("nutrition.scanHistory.deleteA11y")}
      >
        <Trash2 size={18} color={colors.textLo} />
      </Pressable>
    </View>
  );
}
