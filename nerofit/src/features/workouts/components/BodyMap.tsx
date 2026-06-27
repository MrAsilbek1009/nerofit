import { View } from "react-native";
import Svg, { Ellipse, Rect } from "react-native-svg";
import type { GeneratorTarget } from "@/types/db";
import { colors } from "@/theme";

// Stylized front/back body figures whose muscle groups light up (chartreuse)
// for the selected target. Not anatomically exact — a readable, on-brand map.
type Zone =
  | "shoulders"
  | "chest"
  | "arms"
  | "abs"
  | "quads"
  | "back"
  | "glutes"
  | "hamstrings"
  | "calves";

const TARGET_ZONES: Record<GeneratorTarget, Zone[]> = {
  upper: ["shoulders", "chest", "arms", "back"],
  lower: ["quads", "glutes", "hamstrings", "calves"],
  core: ["abs"],
  push: ["chest", "shoulders", "arms"],
  pull: ["back", "arms"],
  full: ["shoulders", "chest", "arms", "abs", "quads", "back", "glutes", "hamstrings", "calves"],
};

type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; rx?: number; zone?: Zone }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; zone?: Zone };

const FRONT: Shape[] = [
  { kind: "ellipse", cx: 50, cy: 16, rx: 11, ry: 13 }, // head
  { kind: "rect", x: 46, y: 27, w: 8, h: 7 }, // neck
  { kind: "ellipse", cx: 30, cy: 42, rx: 11, ry: 7, zone: "shoulders" },
  { kind: "ellipse", cx: 70, cy: 42, rx: 11, ry: 7, zone: "shoulders" },
  { kind: "rect", x: 33, y: 44, w: 15, h: 15, rx: 4, zone: "chest" },
  { kind: "rect", x: 52, y: 44, w: 15, h: 15, rx: 4, zone: "chest" },
  { kind: "rect", x: 16, y: 46, w: 10, h: 58, rx: 5, zone: "arms" },
  { kind: "rect", x: 74, y: 46, w: 10, h: 58, rx: 5, zone: "arms" },
  { kind: "rect", x: 40, y: 60, w: 20, h: 28, rx: 5, zone: "abs" },
  { kind: "rect", x: 37, y: 88, w: 26, h: 12, rx: 4 }, // hips
  { kind: "rect", x: 38, y: 100, w: 11, h: 46, rx: 5, zone: "quads" },
  { kind: "rect", x: 51, y: 100, w: 11, h: 46, rx: 5, zone: "quads" },
  { kind: "rect", x: 39, y: 148, w: 9, h: 44, rx: 4 }, // shins
  { kind: "rect", x: 52, y: 148, w: 9, h: 44, rx: 4 },
];

const BACK: Shape[] = [
  { kind: "ellipse", cx: 50, cy: 16, rx: 11, ry: 13 },
  { kind: "rect", x: 46, y: 27, w: 8, h: 7 },
  { kind: "ellipse", cx: 30, cy: 42, rx: 11, ry: 7, zone: "shoulders" },
  { kind: "ellipse", cx: 70, cy: 42, rx: 11, ry: 7, zone: "shoulders" },
  { kind: "rect", x: 34, y: 44, w: 32, h: 34, rx: 5, zone: "back" },
  { kind: "rect", x: 16, y: 46, w: 10, h: 58, rx: 5, zone: "arms" },
  { kind: "rect", x: 74, y: 46, w: 10, h: 58, rx: 5, zone: "arms" },
  { kind: "ellipse", cx: 43, cy: 96, rx: 10, ry: 9, zone: "glutes" },
  { kind: "ellipse", cx: 57, cy: 96, rx: 10, ry: 9, zone: "glutes" },
  { kind: "rect", x: 38, y: 106, w: 11, h: 44, rx: 5, zone: "hamstrings" },
  { kind: "rect", x: 51, y: 106, w: 11, h: 44, rx: 5, zone: "hamstrings" },
  { kind: "rect", x: 39, y: 152, w: 9, h: 40, rx: 5, zone: "calves" },
  { kind: "rect", x: 52, y: 152, w: 9, h: 40, rx: 5, zone: "calves" },
];

function Figure({ shapes, active }: { shapes: Shape[]; active: Set<Zone> }) {
  return (
    <Svg width={92} height={193} viewBox="0 0 100 210">
      {shapes.map((s, i) => {
        const on = s.zone ? active.has(s.zone) : false;
        const fill = on ? colors.accent : colors.textLo;
        const fillOpacity = on ? 1 : 0.22;
        return s.kind === "rect" ? (
          <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx ?? 3} fill={fill} fillOpacity={fillOpacity} />
        ) : (
          <Ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={fill} fillOpacity={fillOpacity} />
        );
      })}
    </Svg>
  );
}

export function BodyMap({ target }: { target: GeneratorTarget }) {
  const active = new Set(TARGET_ZONES[target]);
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 24 }}>
      <Figure shapes={FRONT} active={active} />
      <Figure shapes={BACK} active={active} />
    </View>
  );
}
