import {
  along,
  bearing,
  booleanIntersects,
  distance,
  length,
  lineIntersect,
  lineString,
  nearestPointOnLine,
  point,
  polygon,
} from "@turf/turf";
import { Collision, Coordinate, Segment, Ward } from "./types";
import { sameRoad, roadNames } from "./roads";
export const xy = ([lat, lon]: Coordinate) => [lon, lat];
export const line = (s: Segment) => lineString(s.geometry.map(xy));
export const meters = (a: Coordinate, b: Coordinate) =>
  distance(point(xy(a)), point(xy(b)), { units: "meters" });
export function nearest(
  segments: Segment[],
  location: Coordinate,
  threshold: number,
) {
  return segments
    .map((s) => ({
      segment: s,
      distance: nearestPointOnLine(line(s), point(xy(location)), {
        units: "meters",
      }).properties.dist,
    }))
    .filter((s) => s.distance <= threshold)
    .sort(
      (a, b) =>
        a.distance - b.distance || a.segment.id.localeCompare(b.segment.id),
    )[0]?.segment;
}
export function assignWards(segment: Segment, wards: Ward[]) {
  return [
    ...new Set(
      wards
        .filter((w) =>
          booleanIntersects(
            line(segment),
            polygon(w.rings.map((r) => r.map(xy))),
          ),
        )
        .map((w) => w.id),
    ),
  ].sort((a, b) => a - b);
}
export function collisionIndex(segments: Segment[]) {
  const roads = new Map<string, Segment[]>();
  for (const segment of segments)
    for (const name of roadNames(segment.road)) {
      const list = roads.get(name) ?? [];
      list.push(segment);
      roads.set(name, list);
    }
  return { roads, intersections: new Map<string, Coordinate[]>() };
}
type CollisionIndex = ReturnType<typeof collisionIndex>;
function indexedRoads(index: CollisionIndex, name: string) {
  return [
    ...new Map(
      roadNames(name)
        .flatMap((n) => index.roads.get(n) ?? [])
        .map((s) => [s.id, s]),
    ).values(),
  ];
}
export function placeCollision(
  c: Collision,
  segments: Segment[],
  threshold: number,
  index?: CollisionIndex,
): { segment?: Segment; reason?: string } {
  const roads = index
    ? indexedRoads(index, c.road)
    : segments.filter((s) => sameRoad(s.road, c.road));
  if (!roads.length)
    return { reason: "StreetName does not match a road segment" };
  const crosses = index
    ? indexedRoads(index, c.crossRoad)
    : segments.filter((s) => sameRoad(s.road, c.crossRoad));
  const cacheKey = JSON.stringify([c.road, c.crossRoad]);
  const found: Coordinate[] =
    index?.intersections.get(cacheKey) ??
    roads.flatMap((s) =>
      crosses.flatMap((x) =>
        lineIntersect(line(s), line(x)).features.map(
          (f) =>
            [
              f.geometry.coordinates[1],
              f.geometry.coordinates[0],
            ] as Coordinate,
        ),
      ),
    );
  index?.intersections.set(cacheKey, found);
  const intersections = [...found];
  if (c.point)
    intersections.sort((a, b) => meters(a, c.point!) - meters(b, c.point!));
  // Multiple geometric intersections need a location to disambiguate.
  if (!c.point && intersections.some((p) => meters(p, intersections[0]) > 10))
    return { reason: "Multiple reference intersections; location required" };
  const origin = intersections[0] ?? c.point;
  if (!origin)
    return { reason: "No reference intersection or valid coordinates" };
  if (!/^from$/i.test(c.fromAt)) {
    if (!/^at$/i.test(c.fromAt) && c.fromAt.trim())
      return { reason: "Unrecognized At / From value" };
    const segment = nearest(roads, origin, threshold);
    return segment
      ? { segment }
      : { reason: "Location outside matching distance" };
  }
  if (c.distanceFt < 0 || !Number.isFinite(c.distanceFt))
    return { reason: "Invalid offset distance" };
  const direction = c.direction
    .replace(/^Direction/i, "")
    .trim()
    .toUpperCase();
  const heading: Record<string, number> = {
    N: 0,
    NORTH: 0,
    E: 90,
    EAST: 90,
    S: 180,
    SOUTH: 180,
    W: 270,
    WEST: 270,
  };
  if (heading[direction] === undefined)
    return { reason: "From collision needs a compass direction" };
  if (c.distanceFt === 0)
    return {
      segment: nearest(roads, origin, threshold),
      reason: "No segment at reference intersection",
    };
  const target = heading[direction];
  const delta = (b: number) => Math.abs(((b - target + 540) % 360) - 180);
  let remaining = c.distanceFt * 0.3048;
  let current = origin;
  const used = new Set<string>();
  for (let step = 0; step <= roads.length; step++) {
    const candidates = roads
      .filter((s) => !used.has(s.id))
      .flatMap((s) => {
        const l = line(s),
          snap = nearestPointOnLine(l, point(xy(current)), { units: "meters" });
        if (snap.properties.dist > (step === 0 ? threshold : 10)) return [];
        const total = length(l, { units: "meters" }),
          at = snap.properties.location;
        return [1, -1].flatMap((sign) => {
          const available = sign === 1 ? total - at : at;
          if (available < 0.01) return [];
          const probe = along(l, at + sign * Math.min(available, 10), {
            units: "meters",
          });
          const angle = delta(bearing(snap, probe));
          return [{ s, sign, available, at, l, angle }];
        });
      })
      .filter((c) => step > 0 || c.angle < 90)
      .sort((a, b) => a.angle - b.angle || a.s.id.localeCompare(b.s.id));
    const next = candidates[0];
    if (!next)
      return { reason: "Offset leaves the mapped StreetName geometry" };
    if (remaining <= next.available + 0.01) return { segment: next.s };
    remaining -= next.available;
    used.add(next.s.id);
    current = next.sign === 1 ? next.s.end : next.s.start;
  }
  return { reason: "Unable to follow offset along StreetName" };
}
