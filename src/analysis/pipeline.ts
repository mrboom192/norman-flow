import capacity from "../config/capacity.json";
import { Inputs, Results, SegmentResult, Settings } from "./types";
import {
  assignWards,
  nearest,
  placeCollision,
  collisionIndex,
} from "./geometry";
import { sameRoad } from "./roads";
export const defaultSettings: Settings = {
  matchDistance: 150,
  laneOverrides: {},
  capacities: capacity,
};
function capacityFor(s: SegmentResult, settings: Settings) {
  const lanes = settings.laneOverrides[s.id] ?? s.lanes;
  s.lanes = lanes;
  if (s.laneCoverage < 100) s.flags.push("Check aerial view");
  if (!lanes) {
    s.flags.push("Lane count unknown");
    return;
  }
  if (/one[ -]?way/i.test(s.travelDirection))
    return settings.capacities["one-way per lane"]?.e * lanes;
  let key = "";
  if (/expressway|freeway/i.test(s.facility ?? ""))
    key = `${lanes}-lane expressway`;
  else if (lanes === 4 || lanes === 6) {
    if (s.divided === undefined)
      s.flags.push("Divider unknown — undivided capacity used");
    key = `${lanes}-lane arterial, ${s.divided ? "divided" : "undivided"}`;
  } else key = `${lanes}-lane arterial`;
  const value = settings.capacities[key]?.e;
  if (!value) s.flags.push("No capacity for this facility");
  return value;
}
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
  let rank = 0;
  rows.forEach((r, i) => {
    if (!i || value(r) !== value(rows[i - 1])) rank = i + 1;
    r[field] = rank;
  });
  return rows;
}
export function runPipeline(
  inputs: Inputs,
  options: Partial<Settings> = {},
  runAt = "",
): Results {
  const settings = { ...defaultSettings, ...options };
  if (!Number.isFinite(settings.matchDistance) || settings.matchDistance <= 0)
    throw new Error("Match distance must be greater than zero.");
  const segments: SegmentResult[] = [...inputs.segments]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      ...s,
      wards:
        inputs.wards.length &&
        (!s.wards.length || inputs.wards.some((w) => w.source !== s.source))
          ? assignWards(s, inputs.wards)
          : [...s.wards],
      collisions: 0,
      flags: [],
    }));
  segments.forEach((s) => {
    s.capacity = capacityFor(s, settings);
  });
  const result: Results = {
    runAt,
    segments,
    wards: {},
    unmatched: [],
    diagnostics: {
      countsMatched: 0,
      countsUnmatched: 0,
      collisionsMatched: 0,
      collisionsUnmatched: 0,
      laneChecks: segments.filter((s) => s.laneCoverage < 100).length,
    },
    settings,
    sources: [
      ...new Set(
        [
          ...inputs.segments,
          ...inputs.wards,
          ...inputs.traffic,
          ...inputs.collisions,
        ].map((r) => r.source),
      ),
    ].sort(),
  };
  for (const count of [...inputs.traffic].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const s =
      count.point && count.volume != null && count.volume >= 0
        ? (nearest(
            segments.filter((s) => sameRoad(s.road, count.road)),
            count.point,
            settings.matchDistance,
          ) as SegmentResult | undefined)
        : undefined;
    if (!s) {
      result.unmatched.push({
        kind: "Traffic",
        id: count.id,
        road: count.road,
        source: count.source,
        raw: count.raw,
        reason: !count.point
          ? "Missing or invalid coordinates"
          : count.volume == null || count.volume < 0
            ? "Missing or invalid volume"
            : "No matching road within distance",
      });
      continue;
    }
    result.diagnostics.countsMatched++;
    if (
      s.maxVolume === undefined ||
      count.volume! > s.maxVolume ||
      (count.volume === s.maxVolume && (count.year ?? 0) > (s.volumeYear ?? 0))
    ) {
      s.maxVolume = count.volume;
      s.volumeYear = count.year;
    }
  }
  segments.forEach((s) => {
    if (s.maxVolume !== undefined && s.capacity)
      s.vc = Math.round((s.maxVolume / s.capacity) * 100) / 100;
  });
  const collisions = [
    ...new Map(inputs.collisions.map((c) => [c.id, c])).values(),
  ].sort((a, b) => a.id.localeCompare(b.id));
  const spatialIndex = collisionIndex(segments);
  for (const c of collisions) {
    const placement = placeCollision(
      c,
      segments,
      settings.matchDistance,
      spatialIndex,
    );
    const s = placement.segment as SegmentResult | undefined;
    const reason = !s
      ? (placement.reason ?? "No matching segment")
      : s.maxVolume === undefined
        ? "Segment has no traffic count"
        : !s.rankable
          ? "Short road is map-only"
          : undefined;
    if (reason)
      result.unmatched.push({
        kind: "Collision",
        id: c.id,
        road: c.road,
        source: c.source,
        raw: c.raw,
        reason,
      });
    else {
      s!.collisions++;
      result.diagnostics.collisionsMatched++;
    }
  }
  for (let ward = 1; ward <= 8; ward++) {
    const rows = segments
      .filter(
        (s) =>
          s.rankable && s.wards.includes(ward) && s.maxVolume !== undefined,
      )
      .map((s) => ({ ...s, flags: [...s.flags] }));
    const vc = ranks(
      rows.filter((s) => s.vc !== undefined),
      (r) => r.vc!,
      "vcRank",
    );
    const collisions = ranks([...rows], (r) => r.collisions, "collisionRank");
    const combined = rows.filter((s) => s.vc !== undefined && s.collisions > 0);
    combined.forEach((s) => {
      s.combinedScore = s.vcRank! + s.collisionRank!;
    });
    ranks(combined, (r) => r.combinedScore!, "combinedRank", true);
    result.wards[ward] = { vc, collisions, combined };
  }
  result.diagnostics.countsUnmatched = result.unmatched.filter(
    (r) => r.kind === "Traffic",
  ).length;
  result.diagnostics.collisionsUnmatched = result.unmatched.filter(
    (r) => r.kind === "Collision",
  ).length;
  return result;
}
