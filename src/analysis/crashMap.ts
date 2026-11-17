import { along, length, lineString } from "@turf/turf";
import type { Coordinate, CrashPoint, Inputs, Segment } from "./types";

type MapFile = { source?: string; visible: boolean; data: Inputs };
export const crashRadiusMeters = 200;

export function visibleCrashPoints(files: MapFile[], segmentIds?: Set<string>) {
  const layers = files.filter((f) => f.data.crashPoints);
  const active =
    [...layers].reverse().find((f) => f.source !== "base") ??
    layers[layers.length - 1];
  const points = active?.visible ? (active.data.crashPoints ?? []) : [];
  return segmentIds ? points.filter((p) => segmentIds.has(p.segment)) : points;
}

export function segmentMidpoint(
  segment: Pick<Segment, "geometry">,
): Coordinate {
  const geometry = lineString(segment.geometry.map(([lat, lon]) => [lon, lat]));
  const [lon, lat] = along(geometry, length(geometry) / 2).geometry.coordinates;
  return [lat, lon];
}

export function topSegmentMarkers(files: MapFile[], segments: Segment[]) {
  const hasUploadedSegments = files.some(
    (f) => f.source !== "base" && f.data.segments.length,
  );
  const layers = files.filter(
    (f) => f.data.summaries && (!hasUploadedSegments || f.source !== "base"),
  );
  const active =
    [...layers].reverse().find((f) => f.source !== "base") ??
    layers[layers.length - 1];
  if (!active?.visible) return [];
  const byId = new Map(segments.map((s) => [s.id, s]));
  return (active.data.summaries ?? [])
    .filter(
      (s) =>
        Number.isInteger(s.cityCombinedRank) &&
        s.cityCombinedRank! >= 1 &&
        s.cityCombinedRank! <= 10 &&
        byId.has(s.id),
    )
    .sort(
      (a, b) =>
        a.cityCombinedRank! - b.cityCombinedRank! || a.id.localeCompare(b.id),
    )
    .slice(0, 10)
    .map((s) => ({
      id: s.id,
      rank: s.cityCombinedRank!,
      road: byId.get(s.id)!.road,
      point: segmentMidpoint(byId.get(s.id)!),
    }));
}

/** Equal-weight compact Gaussian kernels in a local metric projection. */
export function buildCrashDensity(
  points: CrashPoint[],
  radius = crashRadiusMeters,
  cell = 50,
) {
  if (!points.length) return undefined;
  const clusters = crashClusters(points);
  const latitude =
    points.reduce((sum, p) => sum + p.point[0], 0) / points.length;
  const latMeters = 111195;
  const lonMeters = latMeters * Math.cos((latitude * Math.PI) / 180);
  let west = Infinity,
    east = -Infinity,
    south = Infinity,
    north = -Infinity;
  for (const { latitude: lat, longitude: lon } of clusters) {
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  west -= radius / lonMeters;
  north += radius / latMeters;
  const width = Math.ceil(((east - west) * lonMeters + radius) / cell);
  const height = Math.ceil(((north - south) * latMeters + radius) / cell);
  // Bound memory for malformed/worldwide imports without changing kernel radius.
  if (width * height > 4_000_000)
    throw new Error(
      "Crash locations cover too large an area for the Norman density layer.",
    );
  const values = new Float32Array(width * height);
  const reach = Math.ceil(radius / cell);
  for (const { latitude: lat, longitude: lon, count } of clusters) {
    const x = ((lon - west) * lonMeters) / cell;
    const y = ((north - lat) * latMeters) / cell;
    for (
      let row = Math.max(0, Math.floor(y) - reach);
      row <= Math.min(height - 1, Math.floor(y) + reach);
      row++
    ) {
      for (
        let col = Math.max(0, Math.floor(x) - reach);
        col <= Math.min(width - 1, Math.floor(x) + reach);
        col++
      ) {
        const distanceSquared =
          ((col + 0.5 - x) ** 2 + (row + 0.5 - y) ** 2) * cell ** 2;
        if (distanceSquared <= radius ** 2)
          values[row * width + col] +=
            count * Math.exp((-4.5 * distanceSquared) / radius ** 2);
      }
    }
  }
  let max = 0;
  for (const value of values) max = Math.max(max, value);
  return {
    width,
    height,
    values,
    max,
    west,
    north,
    east: west + (width * cell) / lonMeters,
    south: north - (height * cell) / latMeters,
  };
}

/** Group observations within 100 m grid cells, half the smoothing radius. */
export function crashClusters(points: CrashPoint[]) {
  const buckets = new Map<
    string,
    { lat: number; lon: number; count: number }
  >();
  const latitude = points.length
    ? points.reduce((sum, p) => sum + p.point[0], 0) / points.length
    : 35.22;
  const lonMeters = 111195 * Math.cos((latitude * Math.PI) / 180);
  for (const {
    point: [lat, lon],
  } of points) {
    const key = `${Math.floor((lat * 111195) / 100)}:${Math.floor((lon * lonMeters) / 100)}`;
    const bucket = buckets.get(key) ?? { lat: 0, lon: 0, count: 0 };
    bucket.lat += lat;
    bucket.lon += lon;
    bucket.count++;
    buckets.set(key, bucket);
  }
  return [...buckets].map(([id, b]) => ({
    id,
    latitude: b.lat / b.count,
    longitude: b.lon / b.count,
    count: b.count,
  }));
}

export function heatRadiusPixels(latitudeDelta: number, mapHeight: number) {
  return Math.min(
    50,
    Math.max(
      10,
      crashRadiusMeters / ((latitudeDelta * 111195) / Math.max(1, mapHeight)),
    ),
  );
}
