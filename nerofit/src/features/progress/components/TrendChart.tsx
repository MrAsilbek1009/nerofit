import { View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { colors } from "@/theme";

const VB_W = 100;
const VB_H = 100;

export function TrendChart({
  values,
  height = 140,
}: {
  values: number[];
  height?: number;
}) {
  if (values.length < 2) return <View style={{ height }} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = VB_W / (values.length - 1);
  const points = values
    .map((v, i) => {
      const y = VB_H - 6 - ((v - min) / span) * (VB_H - 12);
      return `${(i * step).toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <View style={{ height }}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <Polyline
          points={points}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
