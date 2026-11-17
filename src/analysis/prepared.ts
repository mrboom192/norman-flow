import type { Segment, SegmentSummary } from "./types";
export const rankingsName = "norman_flow_rankings.csv";
export const segmentLayer = "norman_segments.geojson";
export const wardLayer = "norman_wards.geojson";
export const crashLayer = "norman_crash_points.geojson";
/**
 * Bump when parsing of the prepared files changes, so startup re-parses cached
 * base files. Version 2: ward_ranks, full-precision vc, city ranks, lane text.
 */
export const preparedParserVersion = 2;
export function validateJoin(segments: Segment[], summaries: SegmentSummary[]) {
  const expected = new Set(
    segments.filter((s) => s.publishedRanked).map((s) => s.id),
  );
  for (const r of summaries)
    if (!expected.delete(r.id))
      throw new Error("No matching ranked map segment for " + r.id);
  if (expected.size)
    throw new Error("Missing ranking row for " + [...expected][0]);
}
