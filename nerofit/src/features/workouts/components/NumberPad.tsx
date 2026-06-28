import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Check, Delete } from "lucide-react-native";
import { colors, fonts, radii, space, typography } from "@/theme";

export type NumberPadProps = {
  visible: boolean;
  title: string;
  unit?: string;
  // Largest value accepted (defends against fat-finger entries).
  max?: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
};

// 3 x 4 grid: digits, a blank cell, 0, and backspace — matching the design.
const GRID = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
] as const;

// Numeric keypad for entering reps / weight. Always starts at 0 (the previous
// value is NOT pre-filled) so the user types fresh and never has to guess what
// the shown number means.
export function NumberPad({ visible, title, unit, max = 999, onConfirm, onCancel }: NumberPadProps) {
  const [buffer, setBuffer] = useState("");

  useEffect(() => {
    if (visible) setBuffer("");
  }, [visible]);

  const empty = buffer === "";
  const shown = empty ? "0" : buffer;

  function press(k: string) {
    if (k === "") return;
    if (k === "del") {
      setBuffer((b) => b.slice(0, -1));
      return;
    }
    setBuffer((b) => {
      const next = (b + k).replace(/^0+(?=\d)/, "");
      if (Number(next) > max) return b;
      return next.slice(0, 4);
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onCancel} />
      <View
        style={{
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
          <Text
            style={{
              fontFamily: fonts.display,
              color: empty ? colors.textLo : colors.textHi,
              fontSize: 44,
            }}
          >
            {shown}
          </Text>
          {unit ? <Text style={typography.labelCaps}>{unit}</Text> : null}
        </View>

        <View style={{ gap: space[2] }}>
          {GRID.map((row, ri) => (
            <View key={ri} style={{ flexDirection: "row", gap: space[2] }}>
              {row.map((k, ci) => (
                <Pressable
                  key={ci}
                  onPress={() => press(k)}
                  disabled={k === ""}
                  accessibilityRole={k === "" ? undefined : "button"}
                  style={{
                    flex: 1,
                    height: 56,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: radii.sm,
                    backgroundColor: k === "" ? "transparent" : colors.elevated,
                  }}
                >
                  {k === "del" ? (
                    <Delete size={22} color={colors.textHi} />
                  ) : k === "" ? null : (
                    <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 24 }}>{k}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => onConfirm(Number(buffer || "0"))}
          accessibilityRole="button"
          style={{
            alignItems: "center",
            justifyContent: "center",
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
