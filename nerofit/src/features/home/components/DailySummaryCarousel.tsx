import { type ReactNode, useState } from "react";
import { ScrollView, View } from "react-native";
import { colors, space } from "@/theme";

// Horizontal paged carousel for the daily-summary cards, with dot indicators.
// Width is measured from the parent so paging snaps to the content width.
export function DailySummaryCarousel({ pages }: { pages: ReactNode[] }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ gap: space[3] }}
    >
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width }}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
        >
          {pages.map((page, i) => (
            <View key={i} style={{ width }}>
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
