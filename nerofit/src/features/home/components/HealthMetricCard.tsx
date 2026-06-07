import type { ComponentType } from "react";
import { Text, View } from "react-native";
import type { LucideProps } from "lucide-react-native";
import { Card } from "@/components/ui";
import { colors, fonts, radii, space, typography } from "@/theme";

export type HealthMetricCardProps = {
  icon: ComponentType<LucideProps>;
  label: string;
  value: string | null;
  unit?: string;
  emptyMessage: string;
  chart?: React.ReactNode;
};

export function HealthMetricCard({
  icon: Icon,
  label,
  value,
  unit,
  emptyMessage,
  chart,
}: HealthMetricCardProps) {
  return (
    <Card style={{ flex: 1, gap: space[3], minHeight: 150, justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <Icon size={14} color={colors.textLo} />
        <Text style={[typography.labelCaps, { letterSpacing: 0.6 }]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {value ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
            <Text
              style={{
                fontFamily: fonts.display,
                color: colors.textHi,
                fontSize: 30,
              }}
            >
              {value}
            </Text>
            {unit ? (
              <View
                style={{
                  backgroundColor: colors.canvas,
                  borderRadius: radii.sm,
                  paddingHorizontal: space[2],
                  paddingVertical: 3,
                }}
              >
                <Text style={[typography.labelCaps, { fontSize: 9, letterSpacing: 0.8 }]}>
                  {unit}
                </Text>
              </View>
            ) : null}
          </View>
          {chart ?? null}
        </>
      ) : (
        <Text style={typography.bodyMuted}>{emptyMessage}</Text>
      )}
    </Card>
  );
}
