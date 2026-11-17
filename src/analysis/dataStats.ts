// Key numbers for the "Data in this analysis" pages, computed from the loaded
// data so they stay true after an import. Pure TypeScript.
import { officialCapacities } from "./capacity";
import type { Inputs, Results } from "./types";

export type StatId =
  | "segments"
  | "roads"
  | "miles"
  | "medianLength"
  | "standardSegments"
  | "shortSegments"
  | "longSegments"
  | "rankedSegments"
  | "wards"
  | "boundarySegments"
  | "aerialChecks"
  | "aerialCheckSegments"
  | "segmentsWithCount"
  | "noCount"
  | "collectorRoads"
  | "collisionsOnRanked"
  | "crashPoints"
  | "crashPointsOnSegments"
  | "crashYears"
  | "facilities"
  | "overCapacity";

const fmt = (n: number, digits = 0) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function computeStats(
  inputs: Inputs,
  results: Results | null,
): Partial<Record<StatId, string>> {
  const segments = inputs.segments;
  const lengths = segments.map((s) => s.lengthMi).sort((a, b) => a - b);
  const median = lengths.length
    ? lengths.length % 2
      ? lengths[(lengths.length - 1) / 2]
      : (lengths[lengths.length / 2 - 1] + lengths[lengths.length / 2]) / 2
    : undefined;
  const ranked = results?.segments.filter(
    (s) => s.rankable && s.maxVolume !== undefined,
  );
  const status = (text: string) =>
    segments.filter((s) => s.preparedStatus?.toLowerCase().includes(text))
      .length;
  const points = inputs.crashPoints ?? [];
  const years = points.map((p) => p.year).filter((y) => y > 0);
  const summaries = inputs.summaries ?? [];
  const stats: Partial<Record<StatId, string>> = {};
  if (segments.length) {
    stats.segments = fmt(segments.length);
    stats.roads = fmt(new Set(segments.map((s) => s.road)).size);
    stats.miles = fmt(
      segments.reduce((n, s) => n + s.lengthMi, 0),
      1,
    );
    if (median !== undefined) stats.medianLength = `${fmt(median, 2)} mi`;
    stats.standardSegments = fmt(
      lengths.filter((l) => l >= 0.75 && l <= 1.25).length,
    );
    stats.shortSegments = fmt(lengths.filter((l) => l < 0.75).length);
    stats.longSegments = fmt(lengths.filter((l) => l > 1.25).length);
    stats.boundarySegments = fmt(
      segments.filter((s) => s.wards.length > 1).length,
    );
    if (status("no usable count"))
      stats.noCount = fmt(status("no usable count"));
    if (status("collector")) stats.collectorRoads = fmt(status("collector"));
  }
  if (ranked) {
    stats.rankedSegments = fmt(ranked.length);
    stats.segmentsWithCount = fmt(ranked.length);
    stats.overCapacity = fmt(ranked.filter((s) => (s.vc ?? 0) >= 1).length);
    stats.collisionsOnRanked = fmt(
      ranked.reduce((n, s) => n + (s.collisions ?? 0), 0),
    );
  }
  if (inputs.wards.length)
    stats.wards = fmt(new Set(inputs.wards.map((w) => w.id)).size);
  if (summaries.length)
    stats.aerialCheckSegments = fmt(
      summaries.filter((r) => /aerial/i.test(r.laneSource)).length,
    );
  if (summaries.length)
    stats.aerialChecks = `${fmt(
      summaries.filter((r) => /aerial/i.test(r.laneSource)).length,
    )} of ${fmt(summaries.length)} ranked segments`;
  if (points.length) {
    stats.crashPoints = fmt(points.length);
    stats.crashPointsOnSegments = fmt(
      points.filter((p) => p.onStudySegment).length,
    );
    if (years.length)
      stats.crashYears = `${Math.min(...years)}–${Math.max(...years)}`;
  }
  stats.facilities = fmt(Object.keys(officialCapacities).length);
  return stats;
}
