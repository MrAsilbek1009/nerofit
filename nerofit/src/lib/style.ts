import { Platform, type TextStyle } from "react-native";

// react-native-web draws a default focus outline (a visible rectangle) around
// text inputs. Merge this into an input's style to remove it. No-op on native.
export const noWebOutline: TextStyle | null =
  Platform.OS === "web"
    ? ({ outlineStyle: "none" } as unknown as TextStyle)
    : null;
