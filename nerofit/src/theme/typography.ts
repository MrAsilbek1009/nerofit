import { StyleSheet, type TextStyle } from "react-native";
import { colors, fonts } from "./tokens";

// Pre-composed text presets. Screens import these instead of building
// fontFamily/size/color inline. Keeps editorial scale consistent.

export const typography: Record<
  "display" | "h1" | "h2" | "body" | "bodyMuted" | "labelCaps",
  TextStyle
> = StyleSheet.create({
  display: {
    fontFamily: fonts.display,
    color: colors.textHi,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: fonts.display,
    color: colors.textHi,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fonts.heading,
    color: colors.textHi,
    fontSize: 22,
    lineHeight: 26,
  },
  body: {
    fontFamily: fonts.body,
    color: colors.textHi,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyMuted: {
    fontFamily: fonts.body,
    color: colors.textLo,
    fontSize: 15,
    lineHeight: 22,
  },
  labelCaps: {
    fontFamily: fonts.label,
    color: colors.textLo,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});
