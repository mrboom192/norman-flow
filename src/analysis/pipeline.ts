import { rankSegments, rankingVersion } from "./rankings";
import { wardLayer, segmentLayer, validateJoin } from "./prepared";
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
  if (s.laneCoverage != null && s.laneCoverage < 100)
    s.flags.push("Check aerial view");
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
export function runPipeline(
  inputs: Inputs,
  options: Partial<Settings> = {},
  runAt = "",
): Results {
  const settings = { ...defaultSettings, ...options };
  if (!Number.isFinite(settings.matchDistance) || settings.matchDistance <= 0)
    throw new Error("Match distance must be greater than zero.");
  if (inputs.summaries) validateJoin(inputs.segments, inputs.summaries);
  const summaryById = new Map(inputs.summaries?.map((r) => [r.id, r]));
  const segments: SegmentResult[] = [...inputs.segments]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      ...s,
      wards:
        inputs.wards.length &&
        (!s.wards.length ||
          inputs.wards.some(
            (w) =>
              w.source !== s.source &&
              !(s.source === segmentLayer && w.source === wardLayer),
          ))
          ? assignWards(s, inputs.wards)
          : [...s.wards],
      collisions: s.preparedStatus && !inputs.collisions.length ? null : 0,
      flags: [],
    }));
  segments.forEach((s) => {
    const row = summaryById.get(s.id);
    if (row) {
      s.facility = row.facility;
      s.laneSource = row.laneSource;
      s.summarySource = row.source;
      s.divided = /undivided/i.test(row.facility)
        ? false
        : /divided/i.test(row.facility)
          ? true
          : undefined;
      s.maxVolume = row.volume;
      if (!inputs.collisions.length) s.collisions = row.collisions;
    }
    const mapped = capacityFor(s, settings);
    // Preserve the verified facility capacity, including categories absent from the legacy table.
    const adjusted =
      row &&
      mapped !== undefined &&
      mapped !== capacityFor({ ...s, flags: [] }, defaultSettings);
    s.capacity =
      row && !settings.laneOverrides[s.id] && !adjusted ? row.capacity : mapped;
    if (s.capacity)
      s.flags = s.flags.filter((f) => f !== "No capacity for this facility");
  });
  const result: Results = {
    rankingVersion,
    runAt,
    segments,
    wards: {},
    unmatched: [],
    diagnostics: {
      countsMatched: 0,
      countsUnmatched: 0,
      collisionsMatched: 0,
      collisionsUnmatched: 0,
      laneChecks: segments.filter(
        (s) => s.laneCoverage != null && s.laneCoverage < 100,
      ).length,
    },
    settings,
    sources: [
      ...new Set(
        [
          ...inputs.segments,
          ...inputs.wards,
          ...(inputs.summaries ?? []),
          ...inputs.traffic,
          ...inputs.collisions,
          ...(inputs.crashPoints ?? []),
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
    if (s.maxVolume === undefined || !s.capacity) return;
    const row = summaryById.get(s.id);
    // Official results keep the file's full-precision V/C (display rounds to 2
    // decimals). Raw-data runs keep the legacy rule: round to 2 decimals, then rank.
    s.vc =
      row?.vc !== undefined &&
      row.volume === s.maxVolume &&
      row.capacity === s.capacity
        ? row.vc
        : inputs.summaries?.length
          ? s.maxVolume / s.capacity
          : Math.round((s.maxVolume / s.capacity) * 100) / 100;
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
          ? (s.preparedStatus ?? "Short road is map-only")
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
      s!.collisions = (s!.collisions ?? 0) + 1;
      result.diagnostics.collisionsMatched++;
    }
  }
  for (let ward = 1; ward <= 8; ward++) {
    result.wards[ward] = rankSegments(
      segments.filter((s) => s.wards.includes(ward)),
    );
  }
  // Official mode: every ranked value comes unchanged from the results file.
  // Then the calculated combined ward ranks must equal the file's ward_ranks.
  result.official =
    Boolean(inputs.summaries?.length) &&
    // Results files saved by an older app version lack ward_ranks to check.
    inputs.summaries!.every((r) => r.wardRanks) &&
    !inputs.traffic.length &&
    !inputs.collisions.length &&
    segments.every((s) => {
      const row = summaryById.get(s.id);
      return (
        !row ||
        (s.maxVolume === row.volume &&
          s.capacity === row.capacity &&
          s.collisions === row.collisions)
      );
    });
  if (result.official)
    for (const row of inputs.summaries!)
      for (const [ward, expected] of Object.entries(row.wardRanks)) {
        const actual = result.wards[Number(ward)]?.combined.find(
          (s) => s.id === row.id,
        )?.combinedRank;
        if (actual !== expected)
          throw new Error(
            `Ward rank check failed for ${row.id} in Ward ${ward}: the file says ${expected}, but its V/C and collision ranks give ${actual ?? "no rank"}. Re-export the results from the Norman Flow Excel tool.`,
          );
      }
  result.diagnostics.countsUnmatched = result.unmatched.filter(
    (r) => r.kind === "Traffic",
  ).length;
  result.diagnostics.collisionsUnmatched = result.unmatched.filter(
    (r) => r.kind === "Collision",
  ).length;
  return result;
}
