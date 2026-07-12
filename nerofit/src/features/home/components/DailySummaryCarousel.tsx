import { type ReactNode, useState } from "react";
import { ScrollView, View } from "react-native";
import { colors, space } from "@/theme";

// Gutter between pages: cards are borderless on true black, so without it
// adjacent pages read as one merged card mid-swipe.
const PAGE_GAP = space[4];

// Horizontal paged carousel for the daily-summary cards, with dot indicators.
// Width is measured from the parent; snapToInterval (not pagingEnabled, which
// ignores intervals on iOS) keeps the snap exact with the gap included.
export function DailySummaryCarousel({ pages }: { pages: ReactNode[] }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const interval = width + PAGE_GAP;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ gap: space[3] }}
    >
      {width > 0 ? (
        <ScrollView
          horizontal
          snapToInterval={interval}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsHorizontalScrollIndicator={false}
          style={{ width }}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / interval))
          }
        >
          {pages.map((page, i) => (
            // No trailing margin on the last page so content ends exactly on
            // a snap point (no dead scroll space).
            <View key={i} style={{ width, marginRight: i < pages.length - 1 ? PAGE_GAP : 0 }}>
              {page}
            </View>
          ))}
        </ScrollView>
      ) : null}

      {pages.length > 1 ? (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: space[2] }}>
          {pages.map((_, i) => (
            <View
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                backgroundColor: i === index ? colors.accent : colors.border,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
