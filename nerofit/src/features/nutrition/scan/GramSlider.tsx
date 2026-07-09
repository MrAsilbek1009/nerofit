import { useMemo, useState } from "react";
import { PanResponder, View } from "react-native";
import { colors, radii } from "@/theme";

const KNOB = 24;
const TRACK_H = 4;

type GramSliderProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
};

/**
 * Pure-JS horizontal slider for the gram amount (Foodvisor-style portion edit).
 * PanResponder keeps it dependency-free — no native slider module to pin for
 * SDK upgrades. Accent fill matches the progress-stroke rule.
 */
export function GramSlider({ value, min, max, step, onChange }: GramSliderProps) {
  const [width, setWidth] = useState(0);

  // Recreated when bounds/width change — all stable during a drag, so no
  // gesture is ever dropped mid-move.
  const pan = useMemo(() => {
    function setFromX(x: number) {
      if (width <= 0) return;
      const ratio = Math.max(0, Math.min(1, x / width));
      const raw = min + ratio * (max - min);
      const snapped = Math.max(min, Math.min(max, Math.round(raw / step) * step));
      onChange(snapped);
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Claim the gesture so the parent ScrollView doesn't scroll mid-drag.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => setFromX(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => setFromX(evt.nativeEvent.locationX),
    });
  }, [min, max, step, width, onChange]);

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const fillW = Math.max(0, Math.min(1, ratio)) * width;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        const delta = e.nativeEvent.actionName === "increment" ? step : -step;
        onChange(Math.max(min, Math.min(max, value + delta)));
      }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
      style={{ height: 44, justifyContent: "center" }}
    >
      <View
        style={{
          height: TRACK_H,
          borderRadius: radii.pill,
          backgroundColor: colors.border,
          overflow: "hidden",
        }}
      >
        <View style={{ width: fillW, height: "100%", backgroundColor: colors.accent }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: Math.max(0, Math.min(width - KNOB, fillW - KNOB / 2)),
          width: KNOB,
          height: KNOB,
          borderRadius: KNOB / 2,
          backgroundColor: colors.textHi,
        }}
      />
    </View>
  );
}
