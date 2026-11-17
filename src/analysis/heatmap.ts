import type { SegmentResult } from "./types";

export type HeatMetric = "vc" | "collisions";
export type HeatRange = { min: number; max: number };

export function heatValue(segment: SegmentResult, metric: HeatMetric) {
  const value = segment[metric];
  return value != null && Number.isFinite(value) ? value : undefined;
}

export function heatRange(
  segments: SegmentResult[],
  metric: HeatMetric,
): HeatRange | undefined {
  let min = Infinity;
  let max = -Infinity;
  for (const segment of segments) {
    const value = heatValue(segment, metric);
    if (value !== undefined) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  return min === Infinity ? undefined : { min, max };
}

export function heatColor(
  value: number | undefined,
  range: HeatRange | undefined,
  stops: readonly string[],
  missing: string,
) {
  if (value === undefined || !Number.isFinite(value) || !range) return missing;
  // A constant dataset has no low/high distinction; use the midpoint color.
  const fraction =
    range.min === range.max
      ? 0.5
      : Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));
  const position = fraction * (stops.length - 1);
  const index = Math.min(Math.floor(position), stops.length - 2);
  const blend = position - index;
  return `#${[1, 3, 5]
    .map((offset) => {
      const from = parseInt(stops[index].slice(offset, offset + 2), 16);
      const to = parseInt(stops[index + 1].slice(offset, offset + 2), 16);
      return Math.round(from + (to - from) * blend)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}
