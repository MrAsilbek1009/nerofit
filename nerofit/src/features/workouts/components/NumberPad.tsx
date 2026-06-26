import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Check, Delete } from "lucide-react-native";
import { colors, fonts, radii, space, typography } from "@/theme";

export type NumberPadProps = {
  visible: boolean;
  title: string;
  initial: number;
  unit?: string;
  // Largest value accepted (defends against fat-finger entries).
  max?: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

// Full-screen numeric keypad for entering reps / weight, mirroring the player
// design. Editing starts fresh on the first digit so the user overwrites the
// shown value rather than appending to it.
export function NumberPad({
  visible,
  title,
  initial,
  unit,
  max = 999,
  onConfirm,
  onCancel,
}: NumberPadProps) {
  const [buffer, setBuffer] = useState("");

  useEffect(() => {
    if (visible) setBuffer("");
  }, [visible]);

  const shown = buffer === "" ? String(initial) : buffer;

  function press(k: string) {
    setBuffer((b) => {
      const next = (b + k).replace(/^0+(?=\d)/, "");
      if (Number(next) > max) return b;
      return next.slice(0, 4);
    });
  }

  function backspace() {
    setBuffer((b) => b.slice(0, -1));
  }

  function confirm() {
    const v = buffer === "" ? initial : Number(buffer);
    onConfirm(Number.isFinite(v) ? v : initial);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onCancel} />
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radii.md,
          borderTopRightRadius: radii.md,
          paddingHorizontal: space[5],
          paddingTop: space[4],
          paddingBottom: space[6],
          gap: space[4],
        }}
      >
        <Text style={[typography.labelCaps, { textAlign: "center" }]}>{title}</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: space[2] }}>
          <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 48 }}>{shown}</Text>
          {unit ? <Text style={typography.labelCaps}>{unit}</Text> : null}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[2] }}>
          {KEYS.map((k) => (
            <Key key={k} onPress={() => press(k)}>
              <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 24 }}>{k}</Text>
            </Key>
          ))}
          <Key onPress={backspace}>
            <Delete size={22} color={colors.textHi} />
          </Key>
        </View>

        <Pressable
          onPress={confirm}
          accessibilityRole="button"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: space[2],
            backgroundColor: colors.accent,
            borderRadius: radii.pill,
            paddingVertical: space[4],
          }}
        >
          <Check size={20} color={colors.canvas} />
        </Pressable>
      </View>
    </Modal>
  );
}

// 0–9 take a third of the row; backspace fills the last cell next to "0".
function Key({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        width: "31.5%",
        flexGrow: 1,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.elevated,
        borderRadius: radii.sm,
      }}
    >
      {children}
    </Pressable>
  );
}
