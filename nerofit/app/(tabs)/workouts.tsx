import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";
import { ProgramCard } from "@/features/workouts/components/ProgramCard";
import { usePrograms } from "@/lib/queries/programs";
import { colors, space, typography } from "@/theme";

export default function WorkoutsScreen() {
  const { t } = useTranslation();
  const programs = usePrograms();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FlatList
        data={programs.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <ProgramCard program={item} />}
        contentContainerStyle={{
          padding: space[5],
          gap: space[4],
          paddingBottom: space[7],
        }}
        ListHeaderComponent={
          <View style={{ gap: space[1], marginBottom: space[4] }}>
            <Text style={typography.labelCaps}>{t("workouts.subtitle")}</Text>
            <Text style={typography.h1}>{t("workouts.title")}</Text>
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
