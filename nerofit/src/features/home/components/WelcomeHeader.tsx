import { Pressable, Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui";
import { colors, fonts, radii, space, typography } from "@/theme";

export type WelcomeHeaderProps = {
  name: string | null;
  avatarUrl: string | null;
  onNotifications?: () => void;
};

export function WelcomeHeader({
  name,
  avatarUrl,
  onNotifications,
}: WelcomeHeaderProps) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
        <Avatar uri={avatarUrl} name={name} size={48} />
        <View style={{ gap: 2 }}>
          <Text style={typography.labelCaps}>{t("home.welcome")} 👋</Text>
          <Text
            style={{
              fontFamily: fonts.display,
              color: colors.textHi,
              fontSize: 22,
            }}
          >
            {name ?? ""}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onNotifications}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.notifications")}
        hitSlop={8}
        style={{
          width: 40,
          height: 40,
          borderRadius: radii.pill,
          backgroundColor: colors.elevated,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Bell size={18} color={colors.textHi} />
      </Pressable>
    </View>
  );
}
