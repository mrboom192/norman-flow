import type { RankKind, SegmentResult } from "./types";

// Version 3: official tie rule (shared ranks, 1, 1, 3) and full-precision V/C.
export const rankingVersion = 3;

const rankFields = {
  combined: "combinedRank",
  vc: "vcRank",
  collisions: "collisionRank",
} as const;

export type RankingSort =
  | "rank"
  | "combinedScore"
  | "vc"
  | "collisions"
  | "maxVolume"
  | "lanes"
  | "road";
export type SortDirection = "ascending" | "descending";

export function sortRankingRows(
  rows: SegmentResult[],
  kind: RankKind,
  sort: RankingSort,
  direction: SortDirection,
): SegmentResult[] {
  const field = sort === "rank" ? rankFields[kind] : sort;
  const sign = direction === "ascending" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (field === "road") return sign * a.road.localeCompare(b.road);
    const left = a[field];
    const right = b[field];
    // Keep missing values last and preserve the canonical order within ties.
    if (left == null) return right == null ? 0 : 1;
    if (right == null) return -1;
    return sign * (left - right);
  });
}

// Competition ranking, matching the team's Excel tool: rank = 1 + the number of
// rows with a strictly better value, so equal values share the best rank.
// Display order within a tie: higher V/C first, then segment ID.
function ranks(
  rows: SegmentResult[],
  value: (r: SegmentResult) => number,
  field: "vcRank" | "collisionRank" | "combinedRank",
  ascending = false,
) {
  rows.sort(
    (a, b) =>
      (ascending ? 1 : -1) * (value(a) - value(b)) ||
      (b.vc ?? -1) - (a.vc ?? -1) ||
      a.id.localeCompare(b.id),
  );
  rows.forEach((r, i) => {
    r[field] =
      i > 0 && value(r) === value(rows[i - 1]) ? rows[i - 1][field] : i + 1;
  });
  return rows;
}
// Rank a scope independently; never mutate the pipeline's segment or ward rows.
export function rankSegments(
  segments: SegmentResult[],
): Record<RankKind, SegmentResult[]> {
  const rows = [...new Map(segments.map((s) => [s.id, s])).values()]
    .filter((s) => s.rankable && s.maxVolume !== undefined)
    .map<SegmentResult>((s) => ({
      ...s,
      vcRank: undefined,
      collisionRank: undefined,
      combinedRank: undefined,
      combinedScore: undefined,
      flags: [...s.flags],
    }));
  const vc = ranks(
    rows.filter((s) => s.vc !== undefined),
    (r) => r.vc!,
    "vcRank",
  );
  const collisions = ranks(
    rows.filter((s) => s.collisions !== null),
    (r) => r.collisions!,
    "collisionRank",
  );
  const combined = rows.filter(
    (s) => s.vc !== undefined && (s.collisions ?? 0) > 0,
  );
  combined.forEach((s) => {
    s.combinedScore = s.vcRank! + s.collisionRank!;
  });
  ranks(combined, (r) => r.combinedScore!, "combinedRank", true);
  return { vc, collisions, combined };
}
