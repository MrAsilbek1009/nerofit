import { useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { startOfWeek, toLocalDayKey } from "@/features/progress/streak";
import { colors, fonts, space } from "@/theme";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
// Current week + three weeks back (Cal AI-style continuous strip).
const WEEKS_BACK = 3;

// Items may be ISO timestamps (sessions) or YYYY-MM-DD keys (meal log dates).
function toDayKey(value: string): string {
  return value.length === 10 ? value : toLocalDayKey(new Date(value));
}

/**
 * Scrollable day strip (Cal AI reference): opens on the current week, scrolls
 * back three weeks. Day states — today: chartreuse ring; past with activity:
 * solid ring + chartreuse dot; past without: dashed ring, muted; future:
 * muted. Tapping any day opens Progress.
 */
export function WeekStrip({
  activeDays,
  onPressDay,
}: {
  activeDays: string[];
  onPressDay?: () => void;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const active = new Set(activeDays.map(toDayKey));
  const todayKey = toLocalDayKey(new Date());
  const monday = startOfWeek();

  const days = [];
  for (let w = -WEEKS_BACK; w <= 0; w++) {
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + w * 7 + i);
      const dayKey = toLocalDayKey(date);
      days.push({
        key: dayKey,
        letter: t(`progress.days.${DAY_KEYS[i]}`),
        date: date.getDate(),
        isToday: dayKey === todayKey,
        isFuture: dayKey > todayKey,
        isActive: active.has(dayKey),
      });
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Land on the current week (the strip's tail) without a visible jump.
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      contentContainerStyle={{ gap: space[2] }}
    >
      {days.map((d) => (
        <Pressable
          key={d.key}
          onPress={onPressDay}
          disabled={!onPressDay}
          accessibilityRole="button"
          accessibilityLabel={`${d.letter} ${d.date}`}
          style={{ alignItems: "center", gap: space[1], width: 40 }}
        >
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
              // Past day without activity reads as an open (dashed) slot.
              borderStyle: !d.isToday && !d.isFuture && !d.isActive ? "dashed" : "solid",
              borderColor: d.isToday
                ? colors.accent
                : d.isActive
                  ? colors.textLo
                  : colors.border,
              backgroundColor: d.isToday ? colors.elevated : "transparent",
              opacity: d.isFuture ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyMed,
                fontSize: 13,
                color: d.isToday || d.isActive ? colors.textHi : colors.textLo,
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
        </Pressable>
      ))}
    </ScrollView>
  );
}
