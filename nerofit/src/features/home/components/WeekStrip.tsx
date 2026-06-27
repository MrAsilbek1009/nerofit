import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { startOfWeek, toLocalDayKey } from "@/features/progress/streak";
import { colors, fonts, space } from "@/theme";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

// Mon-anchored current week. Today gets the chartreuse ring; days with logged
// activity get a chartreuse dot. Display-only for now (date navigation is a
// later stage).
// `activeDays` are raw ISO timestamps (e.g. session/meal times); they're
// normalised to local day keys here.
export function WeekStrip({ activeDays }: { activeDays: string[] }) {
  const { t } = useTranslation();
  const active = new Set(activeDays.map(toLocalDayKey));
  const todayKey = toLocalDayKey(new Date());
  const monday = startOfWeek();

  const days = DAY_KEYS.map((key, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dayKey = toLocalDayKey(date);
    return {
      letter: t(`progress.days.${key}`),
      date: date.getDate(),
      isToday: dayKey === todayKey,
      isActive: active.has(dayKey),
    };
  });

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {days.map((d, i) => (
        <View key={i} style={{ alignItems: "center", gap: space[1] }}>
          <Text
            style={{
              fontFamily: fonts.label,
              fontSize: 11,
              color: d.isToday ? colors.accent : colors.textLo,
            }}
          >
            {d.letter}
          </Text>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: d.isToday ? 2 : 1,
              borderColor: d.isToday ? colors.accent : colors.border,
              backgroundColor: d.isToday ? colors.elevated : "transparent",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyMed,
                fontSize: 13,
                color: d.isToday ? colors.textHi : colors.textLo,
              }}
            >
              {d.date}
            </Text>
          </View>
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              backgroundColor: d.isActive ? colors.accent : "transparent",
            }}
          />
        </View>
      ))}
    </View>
  );
}
