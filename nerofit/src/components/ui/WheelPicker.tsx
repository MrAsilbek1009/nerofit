import { useEffect, useRef } from "react";
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { colors, fonts, radii, space, typography } from "@/theme";

export type WheelItem = { label: string; value: number };

export type WheelColumnSpec = {
  key: string;
  header?: string;
  items: WheelItem[];
  value: number;
  onChange: (value: number) => void;
};

export type WheelPickerProps = {
  columns: WheelColumnSpec[];
  /** Per-row height in px. */
  itemHeight?: number;
  /** Visible rows — keep odd so a row sits dead-center. */
  visibleCount?: number;
};

const isWeb = Platform.OS === "web";

// iOS-style scroll wheel built on a core ScrollView (no native module, so it
// works in Expo Go and needs no rebuild). Used instead of free-text entry for
// constrained inputs (date of birth, height, weight, …). Tap-to-select keeps
// it usable with a mouse on web/desktop where momentum scrolling is awkward.
export function WheelPicker({
  columns,
  itemHeight = 44,
  visibleCount = 5,
}: WheelPickerProps) {
  const height = itemHeight * visibleCount;
  const hasHeaders = columns.some((c) => c.header);

  return (
    <View>
      {hasHeaders ? (
        <View style={{ flexDirection: "row", marginBottom: space[2] }}>
          {columns.map((c) => (
            <Text
              key={c.key}
              style={[typography.labelCaps, { flex: 1, textAlign: "center" }]}
            >
              {c.header ?? ""}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={{ height }}>
        {/* Centered selection band. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: (height - itemHeight) / 2,
            height: itemHeight,
            borderRadius: radii.md,
            backgroundColor: colors.elevated,
          }}
        />
        <View style={{ flexDirection: "row" }}>
          {columns.map((c) => (
            <WheelColumn
              key={c.key}
              spec={c}
              itemHeight={itemHeight}
              visibleCount={visibleCount}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function WheelColumn({
  spec,
  itemHeight,
  visibleCount,
}: {
  spec: WheelColumnSpec;
  itemHeight: number;
  visibleCount: number;
}) {
  const { items, value, onChange } = spec;
  const scrollY = useRef(new Animated.Value(0)).current;
  const ref = useRef<ScrollView>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while WE drive the scroll position, so a programmatic scroll doesn't
  // feed back into settle() and make the wheel creep on its own.
  const snapping = useRef(false);
  const pad = ((visibleCount - 1) / 2) * itemHeight;

  const selectedIndex = Math.max(
    0,
    items.findIndex((i) => i.value === value),
  );

  function clearTimers() {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    if (snapTimer.current) clearTimeout(snapTimer.current);
    settleTimer.current = null;
    snapTimer.current = null;
  }

  // Land on the current value on mount; tidy timers on unmount.
  useEffect(() => {
    snapping.current = true;
    const id = setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * itemHeight, animated: false });
      snapTimer.current = setTimeout(() => {
        snapping.current = false;
      }, 60);
    }, 0);
    return () => {
      clearTimeout(id);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snapTo(i: number) {
    snapping.current = true;
    ref.current?.scrollTo({ y: i * itemHeight, animated: true });
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      snapping.current = false;
    }, 260);
  }

  // Commit the row at index `i` (clamped) and snap to it. Used by both scroll
  // settle and tap-to-select.
  function pick(i: number) {
    const clamped = Math.min(items.length - 1, Math.max(0, i));
    const next = items[clamped];
    if (!next) return;
    if (next.value !== value) onChange(next.value);
    snapTo(clamped);
  }

  function settle(y: number) {
    if (snapping.current) return;
    pick(Math.round(y / itemHeight));
  }

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: !isWeb,
      // Web has no momentum events — debounce scroll to detect "stopped".
      listener: isWeb
        ? (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (snapping.current) return;
            const y = e.nativeEvent.contentOffset.y;
            if (settleTimer.current) clearTimeout(settleTimer.current);
            settleTimer.current = setTimeout(() => settle(y), 140);
          }
        : undefined,
    },
  );

  return (
    <Animated.ScrollView
      ref={ref}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={itemHeight}
      decelerationRate="fast"
      scrollEventThrottle={16}
      nestedScrollEnabled
      onScroll={onScroll}
      onScrollBeginDrag={() => {
        // A real drag — stop guarding and cancel any pending settle.
        snapping.current = false;
        if (settleTimer.current) clearTimeout(settleTimer.current);
      }}
      onScrollEndDrag={(e) => {
        if (isWeb) return; // covers a slow native drag with no momentum
        const y = e.nativeEvent.contentOffset.y;
        if (settleTimer.current) clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(() => settle(y), 80);
      }}
      onMomentumScrollBegin={() => {
        if (settleTimer.current) clearTimeout(settleTimer.current);
      }}
      onMomentumScrollEnd={(e) => {
        if (isWeb) return;
        settle(e.nativeEvent.contentOffset.y);
      }}
      contentContainerStyle={{ paddingVertical: pad }}
    >
      {items.map((item, i) => {
        const inputRange = [
          (i - 2) * itemHeight,
          (i - 1) * itemHeight,
          i * itemHeight,
          (i + 1) * itemHeight,
          (i + 2) * itemHeight,
        ];
        const opacity = scrollY.interpolate({
          inputRange,
          outputRange: [0.25, 0.5, 1, 0.5, 0.25],
          extrapolate: "clamp",
        });
        const scale = scrollY.interpolate({
          inputRange,
          outputRange: [0.82, 0.9, 1, 0.9, 0.82],
          extrapolate: "clamp",
        });
        return (
          <Pressable key={item.value} onPress={() => pick(i)}>
            <Animated.View
              style={{
                height: itemHeight,
                alignItems: "center",
                justifyContent: "center",
                opacity,
                transform: [{ scale }],
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 24,
                  color: colors.textHi,
                }}
              >
                {item.label}
              </Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </Animated.ScrollView>
  );
}
