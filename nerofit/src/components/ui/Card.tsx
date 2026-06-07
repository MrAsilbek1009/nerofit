import { View, type ViewProps } from "react-native";
import { colors, radii, space } from "@/theme";

export type CardProps = ViewProps & {
  padded?: boolean;
};

export function Card({ padded = true, style, children, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.elevated,
          borderRadius: radii.md,
          padding: padded ? space[4] : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
