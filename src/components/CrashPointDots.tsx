import { useMemo } from "react";
import { Path } from "react-native-svg";
import type { CrashPoint } from "../analysis/types";
import { useTheme } from "../theme";

/** A single path keeps the full point layer inexpensive on native and web. */
export function CrashPointDots({
  points,
  project,
  radius = 1.3,
}: {
  points: CrashPoint[];
  project: (point: number[]) => string;
  radius?: number;
}) {
  const c = useTheme();
  const path = useMemo(
    () =>
      points
        .map(({ point }) => {
          const [x, y] = project(point).split(",").map(Number);
          return `M${(x - radius).toFixed(2)},${y.toFixed(2)}a${radius},${radius} 0 1,0 ${2 * radius},0a${radius},${radius} 0 1,0 ${-2 * radius},0`;
        })
        .join(""),
    [points, project, radius],
  );
  return (
    <Path
      d={path}
      fill={c.crashMarker}
      fillOpacity={0.75}
      pointerEvents="none"
    />
  );
}
