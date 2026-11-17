// Prepared City data uses a stable, padded segment key, not a point/count join.
import * as XLSX from "xlsx";
import {
  Coordinate,
  Inputs,
  Segment,
  SegmentSummary,
  emptyInputs,
} from "../types";
import { rankingsName, wardLayer, segmentLayer, crashLayer } from "../prepared";
function num(v: unknown, label: string, min = 0) {
  if (
    v == null ||
    String(v).trim() === "" ||
    !Number.isFinite(Number(v)) ||
    Number(v) < min
  )
    throw new Error("Invalid " + label + ": " + v);
  return Number(v);
}
function name(v: unknown, label: string) {
  if (typeof v !== "string" || !v.trim()) throw new Error("Missing " + label);
  return v.trim();
}
function coord(value: unknown): Coordinate {
  if (!Array.isArray(value) || value.length < 2)
    throw new Error("Invalid GeoJSON coordinate");
  const [lon, lat] = value;
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    throw new Error("Expected WGS84 longitude, latitude");
  return [lat, lon];
}
export function readPrepared(bytes: Uint8Array, source: string): Inputs {
  const data = emptyInputs();
  const seen = new Set<string>();
  function unique(key: string) {
    if (seen.has(key)) throw new Error("Duplicate key: " + key);
    seen.add(key);
    return key;
  }
  if (source === rankingsName) {
    const book = XLSX.read(bytes, { type: "array", raw: true });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      book.Sheets[book.SheetNames[0]],
    );
    data.summaries = rows.map((row): SegmentSummary => {
      const id = unique(name(row.key, "segment key")),
        volume = num(row.volume, "volume"),
        capacity = num(row.capacity, "capacity"),
        collisions = num(row.collisions, "collision total");
      if (
        !Number.isInteger(collisions) ||
        capacity <= 0 ||
        Math.abs(volume / capacity - num(row.vc, "V/C")) > 0.000001
      )
        throw new Error("Inconsistent metrics for " + id);
      return {
        id,
        cityCombinedRank:
          row.city_combined_rank == null ||
          String(row.city_combined_rank).trim() === ""
            ? undefined
            : num(row.city_combined_rank, "published combined rank", 1),
        volume,
        capacity,
        collisions,
        facility: name(row.facility, "facility"),
        laneSource: name(row.lane_source, "lane source"),
        source,
      };
    });
    return data;
  }
  const collection = JSON.parse(new TextDecoder().decode(bytes));
  if (
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features)
  )
    throw new Error("Expected a GeoJSON FeatureCollection");
  for (const { properties: p, geometry: g } of collection.features) {
    if (source === crashLayer) {
      if (g?.type !== "Point" || !p || typeof p.on_study_segment !== "boolean")
        throw new Error("Expected a crash Point with study-segment metadata");
      const id = unique(name(p.accident, "crash ID"));
      const year = num(p.year, "crash year", 1900);
      if (!Number.isInteger(year)) throw new Error("Invalid crash year");
      (data.crashPoints ??= []).push({
        id,
        point: coord(g.coordinates),
        year,
        date: name(p.date, "crash date"),
        street: String(p.street ?? ""),
        crossStreet: String(p.cross_street ?? ""),
        segment: String(p.segment ?? ""),
        onStudySegment: p.on_study_segment,
        source,
      });
      continue;
    }
    if (source === wardLayer) {
      const id = num(p.ward_num, "ward", 1);
      unique(String(id));
      if (id > 8 || !Number.isInteger(id) || g.type !== "Polygon")
        throw new Error("Invalid ward boundary");
      const rings: Coordinate[][] = g.coordinates.map((ring: unknown[]) =>
        ring.map(coord),
      );
      if (
        !rings.length ||
        rings.some(
          (r) => r.length < 4 || String(r[0]) !== String(r[r.length - 1]),
        )
      )
        throw new Error("Incomplete ward polygon");
      data.wards.push({ id, rings, source });
      continue;
    }
    if (source !== segmentLayer || g.type !== "LineString")
      throw new Error("Expected a segment LineString");
    const geometry: Coordinate[] = g.coordinates.map(coord);
    if (geometry.length < 2) throw new Error("Incomplete segment geometry");
    const id = unique(name(p.key, "segment key")),
      road = name(p.road, "road"),
      index = num(p.segment, "segment number", 1),
      lengthMi = num(p.length_mi, "length"),
      status = name(p.status, "status");
    const wards = [
      ...name(p.wards, "wards").matchAll(/\bWard\s+([1-8])\b/gi),
    ].map((m) => Number(m[1]));
    if (!wards.length || typeof p.ranked !== "boolean")
      throw new Error("Invalid segment metadata: " + id);
    const laneText = String(p.lanes ?? ""),
      match = laneText.match(/^(\d+) lanes?/i);
    data.segments.push({
      id,
      road,
      index,
      of: 0,
      roadTotalMi: 0,
      lengthMi,
      wards,
      wardMajority: wards.length === 1 ? wards[0] : 0,
      start: geometry[0],
      end: geometry[geometry.length - 1],
      geometry,
      lanes: match
        ? Number(match[1]) + Number(/center turn lane/i.test(laneText))
        : null,
      laneCoverage: null,
      travelDirection: /one-way/i.test(laneText) ? "one-way" : "",
      rankable: !status.toLowerCase().includes("collector"),
      preparedStatus: status,
      publishedRanked: p.ranked,
      source,
      from: p.from_street,
      to: p.to_street,
    });
  }
  const groups = new Map<string, Segment[]>();
  for (const s of data.segments) {
    const group = groups.get(s.road) ?? [];
    group.push(s);
    groups.set(s.road, group);
  }
  for (const group of groups.values()) {
    const miles = group.reduce((v, s) => v + s.lengthMi, 0),
      of = Math.max(...group.map((s) => s.index));
    for (const s of group) {
      s.of = of;
      s.roadTotalMi = miles;
    }
  }
  return data;
}
