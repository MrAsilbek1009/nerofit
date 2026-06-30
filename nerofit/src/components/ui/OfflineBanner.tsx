import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react-native";
import { colors, space, typography } from "@/theme";

// Thin top bar shown only while the device is offline. Persisted query cache
// keeps the app usable; this just tells the user why data may be stale.
export function OfflineBanner() {
  const { isConnected } = useNetInfo();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // null = still detecting — only surface when explicitly offline.
  if (isConnected !== false) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingTop: insets.top + space[1],
        paddingBottom: space[2],
        paddingHorizontal: space[5],
        backgroundColor: colors.elevated,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: space[2],
      }}
    >
      <WifiOff size={14} color={colors.textLo} />
      <Text style={[typography.labelCaps, { color: colors.textHi }]}>
        {t("common.offline")}
      </Text>
    </View>
  );
}
