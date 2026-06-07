import { View } from "react-native";
import Svg, { Polyline, Rect } from "react-native-svg";
import { colors } from "@/theme";

const VB_W = 100;
const VB_H = 40;

function normalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v) => (v - min) / span);
}

export type MiniChartProps = {
  // Oldest → newest.
  values: number[];
  height?: number;
};

// Bar chart for blood pressure — the most recent bar is highlighted chartreuse.
export function MiniBars({ values, height = 40 }: MiniChartProps) {
  const data = values.slice(-7);
  const norm = normalize(data);
  const n = norm.length || 1;
  const slot = VB_W / n;
  const barW = slot * 0.5;

  return (
    <View style={{ height }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        {norm.map((v, i) => {
          const h = 6 + v * (VB_H - 6);
          const isLast = i === norm.length - 1;
          return (
            <Rect
              key={i}
              x={i * slot + (slot - barW) / 2}
              y={VB_H - h}
              width={barW}
              height={h}
              rx={1.5}
              fill={isLast ? colors.accent : colors.border}
            />
          );
        })}
      </Svg>
    </View>
  );
}

// Line chart for heart rate.
export function MiniSparkline({ values, height = 40 }: MiniChartProps) {
  const data = values.slice(-12);
  const norm = normalize(data);
  if (norm.length < 2) {
    // A flat single point reads as empty; let the caller show an empty state.
    return <View style={{ height }} />;
  }
  const step = VB_W / (norm.length - 1);
  const points = norm
    .map((v, i) => `${i * step},${VB_H - (4 + v * (VB_H - 8))}`)
    .join(" ");

  return (
    <View style={{ height }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        <Polyline
          points={points}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
