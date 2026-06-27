import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ProgressRing } from "@/components/ui";
import {
  type MicroTotals,
  healthBand,
  microIsGood,
} from "@/features/home/summary";
import { colors, fonts, radii, space, typography } from "@/theme";

const BAND_COLOR = {
  good: colors.success,
  fair: colors.carbs,
  poor: colors.danger,
} as const;

// Carousel page 2: today's Health Score (0–10) + the micros that drive it.
// Shows an N/A state until any logged meal carries micro data.
export function MicrosCard({
  micros,
  score,
}: {
  micros: MicroTotals;
  score: number | null;
}) {
  const { t } = useTranslation();
  const band = score != null ? healthBand(score) : null;
  const ringColor = band ? BAND_COLOR[band] : colors.border;

  return (
    <View
      style={{
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        padding: space[5],
        gap: space[4],
      }}
    >
      {/* Score header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ gap: space[1] }}>
          <Text style={typography.labelCaps}>{t("home.healthScore")}</Text>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 22,
              color: band ? BAND_COLOR[band] : colors.textLo,
            }}
          >
            {band ? t(`home.bands.${band}`) : t("home.na")}
          </Text>
        </View>
        <ProgressRing
          progress={score != null ? score / 10 : 0}
          size={64}
          strokeWidth={7}
          color={ringColor}
        >
          <Text style={{ fontFamily: fonts.label, fontSize: 14, color: colors.textHi }}>
            {score != null ? `${score}/10` : t("home.na")}
          </Text>
        </ProgressRing>
      </View>

      {score == null ? (
        <Text style={[typography.bodyMuted, { fontSize: 13 }]}>{t("home.healthEmpty")}</Text>
      ) : null}

      {/* Micro rows */}
      <View style={{ gap: space[3], borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space[4] }}>
        <MicroRow
          label={t("home.micros.fiber")}
          value={micros.hasData ? `${Math.round(micros.fiber)} ${t("nutrition.g")}` : "—"}
          good={micros.hasData ? microIsGood("fiber", micros.fiber) : null}
        />
        <MicroRow
          label={t("home.micros.netCarbs")}
          value={micros.hasData ? `${Math.round(micros.netCarbs)} ${t("nutrition.g")}` : "—"}
          good={null}
        />
        <MicroRow
          label={t("home.micros.sugar")}
          value={micros.hasData ? `${Math.round(micros.sugar)} ${t("nutrition.g")}` : "—"}
          good={micros.hasData ? microIsGood("sugar", micros.sugar) : null}
        />
        <MicroRow
          label={t("home.micros.sodium")}
          value={micros.hasData ? `${Math.round(micros.sodium)} ${t("home.mg")}` : "—"}
          good={micros.hasData ? microIsGood("sodium", micros.sodium) : null}
        />
      </View>
    </View>
  );
}

function MicroRow({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good: boolean | null;
}) {
  const dotColor = good == null ? colors.textLo : good ? colors.success : colors.danger;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={[typography.body, { color: colors.textLo }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 14 }}>{value}</Text>
        <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: dotColor }} />
      </View>
    </View>
  );
}
