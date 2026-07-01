import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui";
import { useDeleteAccount } from "@/lib/queries/account";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const deleteAccount = useDeleteAccount();

  const items = [
    t("deleteAccount.items.profile"),
    t("deleteAccount.items.workouts"),
    t("deleteAccount.items.nutrition"),
    t("deleteAccount.items.chat"),
  ];

  function confirm() {
    Alert.alert(
      t("deleteAccount.confirmTitle"),
      t("deleteAccount.confirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("deleteAccount.confirmDelete"),
          style: "destructive",
          onPress: () =>
            deleteAccount.mutate(undefined, {
              onError: (e) =>
                Alert.alert(t("common.error"), e instanceof Error ? e.message : String(e)),
            }),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space[2],
          paddingHorizontal: space[4],
          paddingVertical: space[3],
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.goBack")}
          hitSlop={8}
        >
          <ArrowLeft size={24} color={colors.textHi} />
        </Pressable>
        <Text style={{ fontFamily: fonts.heading, color: colors.textHi, fontSize: 18 }}>
          {t("deleteAccount.title")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space[5],
          paddingTop: space[5],
          paddingBottom: space[5],
          gap: space[5],
          flexGrow: 1,
        }}
      >
        <View
          style={{
            alignSelf: "flex-start",
            padding: space[3],
            borderRadius: radii.md,
            backgroundColor: colors.elevated,
          }}
        >
          <Trash2 size={28} color={colors.danger} />
        </View>

        <View style={{ gap: space[2] }}>
          <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 26 }}>
            {t("deleteAccount.heading")}
          </Text>
          <Text style={typography.body}>{t("deleteAccount.subtitle")}</Text>
        </View>

        <View style={{ gap: space[3] }}>
          {items.map((label) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
              <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: colors.danger }} />
              <Text style={[typography.body, { color: colors.textHi }]}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={[typography.body, { color: colors.textLo }]}>
          {t("deleteAccount.irreversible")}
        </Text>

        <View style={{ flex: 1 }} />

        <View style={{ gap: space[3] }}>
          <Pressable
            onPress={confirm}
            disabled={deleteAccount.isPending}
            accessibilityRole="button"
            style={{
              height: 56,
              borderRadius: radii.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.danger,
              opacity: deleteAccount.isPending ? 0.5 : 1,
            }}
          >
            <Text style={{ fontFamily: fonts.label, fontSize: 15, color: colors.canvas }}>
              {deleteAccount.isPending
                ? t("deleteAccount.deleting")
                : t("deleteAccount.confirmDelete")}
            </Text>
          </Pressable>

          <Button
            label={t("common.cancel")}
            variant="secondary"
            onPress={() => router.back()}
            disabled={deleteAccount.isPending}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
