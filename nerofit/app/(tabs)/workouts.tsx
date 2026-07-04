import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles } from "lucide-react-native";
import { Button, VideoCard } from "@/components/ui";
import { useCurriculumPrograms } from "@/lib/queries/curriculum";
import { useCompletedCustomSessions } from "@/lib/queries/customWorkouts";
import { customStats } from "@/features/workouts/customStats";
import { useUserId } from "@/hooks/useUser";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function WorkoutsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useUserId();
  const programs = useCurriculumPrograms();
  const customSessions = useCompletedCustomSessions(userId);
  const stats = customStats(customSessions.data ?? []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FlatList
        data={programs.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <VideoCard
            title={item.title}
            subtitle={item.level.toUpperCase()}
            imageUri={item.image_url ?? undefined}
            aspectRatio={16 / 11}
            onPress={() =>
              router.push(
                `/program/${item.id}?title=${encodeURIComponent(item.title)}&level=${item.level}`,
              )
            }
          />
        )}
        contentContainerStyle={{
          padding: space[5],
          gap: space[4],
          paddingBottom: space[7],
        }}
        ListHeaderComponent={
          <View style={{ gap: space[4], marginBottom: space[4] }}>
            <View style={{ gap: space[1] }}>
              <Text style={typography.labelCaps}>{t("workouts.subtitle")}</Text>
              <Text style={typography.h1}>{t("workouts.title")}</Text>
            </View>
            <Pressable
              onPress={() => router.push("/workout-generator")}
              accessibilityRole="button"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space[3],
                backgroundColor: colors.elevated,
                borderRadius: radii.md,
                padding: space[4],
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radii.pill,
                  backgroundColor: colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={20} color={colors.canvas} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 16 }}>
                  {t("generator.promoTitle")}
                </Text>
                <Text style={[typography.bodyMuted, { fontSize: 12 }]}>{t("generator.promoSub")}</Text>
              </View>
              <ChevronRight size={20} color={colors.textLo} />
            </Pressable>
            {stats.count > 0 ? (
              <View style={{ flexDirection: "row", gap: space[5], paddingHorizontal: space[1] }}>
                <Text style={[typography.labelCaps, { color: colors.accent }]}>
                  {t("generator.workoutsN", { count: stats.count })}
                </Text>
                {stats.streak > 0 ? (
                  <Text style={[typography.labelCaps, { color: colors.accent }]}>
                    {t("generator.streakN", { count: stats.streak })}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          programs.isLoading ? (
            <View style={{ paddingTop: space[7], alignItems: "center" }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : programs.error ? (
            <View style={{ paddingTop: space[7], alignItems: "center", gap: space[4] }}>
              <Text style={typography.body}>{t("common.error")}</Text>
              <Button
                label={t("common.retry")}
                fullWidth={false}
                onPress={() => programs.refetch()}
              />
            </View>
          ) : (
            <View style={{ paddingTop: space[7], alignItems: "center" }}>
              <Text style={typography.bodyMuted}>{t("workouts.empty")}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
