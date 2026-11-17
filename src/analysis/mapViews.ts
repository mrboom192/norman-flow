// Live map views of the loaded results (no static images), so every import
// recolors the map. Pure TypeScript: no React Native imports.
import { segmentMidpoint } from "./crashMap";
import { heatColor, type HeatRange } from "./heatmap";
import { rankSegments } from "./rankings";
import type { Coordinate, RankKind, Results, SegmentResult } from "./types";

export type MapMetric = RankKind | "crashes";
export const mapMetrics: { key: MapMetric; label: string }[] = [
  { key: "combined", label: "Combined" },
  { key: "vc", label: "V/C" },
  { key: "collisions", label: "Collisions" },
  { key: "crashes", label: "Hotspots" },
];

export type RankedRow = SegmentResult & { rank: number; value: number };

const rankField = {
  vc: "vcRank",
  collisions: "collisionRank",
  combined: "combinedRank",
} as const;
const valueOf = (s: SegmentResult, metric: RankKind) =>
  metric === "vc"
    ? s.vc!
    : metric === "collisions"
      ? s.collisions!
      : s.combinedScore!;

/**
 * The ranked list behind a map view, best first. Citywide ranks every unique
 * segment (these match the results file's city_* rank columns); a ward uses
 * that ward's own ranks, so a boundary segment can rank differently in each.
 */
export function rankedRows(
  results: Results | null,
  metric: RankKind,
  ward?: number,
): RankedRow[] {
  if (!results) return [];
  const list =
    ward === undefined
      ? rankSegments(results.segments)[metric]
      : (results.wards[ward]?.[metric] ?? []);
  return list.map((s) => ({
    ...s,
    rank: s[rankField[metric]]!,
    value: valueOf(s, metric),
  }));
}

/** Combined rank tiers, best first: top 3, 4–5, 6–10, 11+. */
export function combinedTier(rank: number) {
  return rank <= 3 ? 0 : rank <= 5 ? 1 : rank <= 10 ? 2 : 3;
}
export const combinedTierLabels = ["Top 3", "4–5", "6–10", "11+"];

export type SegmentStyle = {
  color: string;
  tier: number;
  overCapacity: boolean;
};

/**
 * Color and emphasis tier (0 = strongest) for a ranked segment in the current
 * view. V/C and collisions use continuous scales; combined uses rank tiers.
 */
export function segmentStyle(
  row: RankedRow,
  metric: RankKind,
  range: HeatRange | undefined,
  palette: {
    vcScale: readonly string[];
    collisionScale: readonly string[];
    combinedTiers: readonly string[];
  },
): SegmentStyle {
  if (metric === "combined") {
    const tier = combinedTier(row.rank);
    return { color: palette.combinedTiers[tier], tier, overCapacity: false };
  }
  const scale = metric === "vc" ? palette.vcScale : palette.collisionScale;
  const fraction =
    range && range.max > range.min
      ? (row.value - range.min) / (range.max - range.min)
      : 0.5;
  return {
    color: heatColor(row.value, range, scale, scale[0]),
    tier: fraction >= 0.75 ? 0 : fraction >= 0.5 ? 1 : fraction >= 0.25 ? 2 : 3,
    overCapacity: metric === "vc" && row.value >= 1,
  };
}

export function valueRange(rows: RankedRow[]): HeatRange | undefined {
  if (!rows.length) return undefined;
  const values = rows.map((r) => r.value);
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** "#1 LINDSEY ST: 24TH AVE NE/SE to 36TH AVE NE/SE (V/C 1.06, 485 crashes)" */
export function describeRanked(row: RankedRow) {
  const where =
    row.from && row.to
      ? `${row.from} to ${row.to}`
      : `segment ${row.index} of ${row.of}`;
  return `#${row.rank} ${row.road}: ${where} (V/C ${row.vc?.toFixed(2) ?? "—"}, ${row.collisions ?? "—"} crashes)`;
}

/** Badges for the top segments of a view, at each segment's midpoint. */
export function rankBadges(rows: RankedRow[], limit = 5) {
  return rows
    .filter((r) => r.rank <= limit)
    .slice(0, limit)
    .map((r) => ({ id: r.id, rank: r.rank, point: segmentMidpoint(r) }));
}

/** Bounding box of a ward's outer ring, [south-west, north-east]. */
export function wardBounds(
  wards: { id: number; rings: Coordinate[][] }[],
  ward: number,
): [Coordinate, Coordinate] | undefined {
  const ring = wards.find((w) => w.id === ward)?.rings[0];
  if (!ring?.length) return undefined;
  const lats = ring.map((p) => p[0]),
    lons = ring.map((p) => p[1]);
  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];
}
