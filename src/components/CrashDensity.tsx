import { useMemo } from "react";
import type { CrashPoint } from "../analysis/types";
import { crashDensityImage } from "../analysis/crashDensityImage";
import { useTheme } from "../theme";

export function CrashDensity({
  points,
  project,
}: {
  points: CrashPoint[];
  project: (point: number[]) => string;
}) {
  const { crashHeatColors } = useTheme();
  const image = useMemo(
    () => crashDensityImage(points, crashHeatColors),
    [points, crashHeatColors],
  );
  if (!image) return null;
  const [[north, east], [south, west]] = image.bounds;
  const [x, y] = project([north, west]).split(",").map(Number);
  const [right, bottom] = project([south, east]).split(",").map(Number);
  return (
    <image
      href={image.uri}
      x={x}
      y={y}
      width={right - x}
      height={bottom - y}
      preserveAspectRatio="none"
      pointerEvents="none"
    />
  );
}
