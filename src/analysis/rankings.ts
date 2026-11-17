import type { RankKind, SegmentResult } from "./types";

export const rankingVersion = 2;

function ranks(
  rows: SegmentResult[],
  value: (r: SegmentResult) => number,
  field: "vcRank" | "collisionRank" | "combinedRank",
  ascending = false,
) {
  rows.sort(
    (a, b) =>
      (ascending ? 1 : -1) * (value(a) - value(b)) ||
      (field === "combinedRank" ? (b.vc ?? 0) - (a.vc ?? 0) : 0) ||
      a.id.localeCompare(b.id),
  );
  rows.forEach((r, i) => {
    r[field] = i + 1;
  });
  return rows;
}
// Rank a scope independently; never mutate the pipeline's segment or ward rows.
export function rankSegments(
  segments: SegmentResult[],
  fullPrecision = segments.some((s) => Boolean(s.summarySource)),
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
    (r) => (fullPrecision ? r.maxVolume! / r.capacity! : r.vc!),
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
