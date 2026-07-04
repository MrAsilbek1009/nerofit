import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import { space } from "@/theme";

// Floating close button used over the camera / result stages. `top` is passed in
// so callers can offset by the safe-area inset.
export function CloseButton({ top, onPress }: { top: number; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("a11y.close")}
      onPress={onPress}
      hitSlop={10}
      style={{
        position: "absolute",
        top,
        left: space[4],
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <X size={22} color="#FFFFFF" />
    </Pressable>
  );
}
