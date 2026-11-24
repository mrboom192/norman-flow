import { expect, it, jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { readPrepared } from "../src/analysis/parse/prepared";
import {
  crashLayer,
  rankingsName,
  segmentLayer,
} from "../src/analysis/prepared";
import {
  buildCrashDensity,
  crashClusters,
  heatRadiusPixels,
  segmentMidpoint,
  topSegmentMarkers,
  visibleCrashPoints,
} from "../src/analysis/crashMap";
import { combine } from "../src/store/useFlow";
import { defaultMapLayerOrder, moveMapLayer } from "../src/analysis/mapLayers";
import { runPipeline } from "../src/analysis/pipeline";
import { emptyInputs, type CrashPoint } from "../src/analysis/types";

jest.mock("../src/store/storage", () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));
const bytes = (name: string) =>
  readFileSync(join(__dirname, "../assets/data/base", name));
const point = (id: string, segment = "A"): CrashPoint => ({
  id,
  point: [35.22, -97.44],
  year: 2025,
  date: "2025-01-01",
  street: "A",
  crossStreet: "B",
  segment,
  onStudySegment: false,
  source: crashLayer,
});
const file = (data = emptyInputs(), source = "base", visible = true) => ({
  name: crashLayer,
  type: "GEOJSON",
  summary: "",
  data,
  source: source as "base" | "uploaded",
  visible,
});

it("defaults to hotspots above the roads and can move a layer anywhere in the stack", () => {
  const order = [...defaultMapLayerOrder];
  expect(order).toEqual(["hotspots", "segments", "wards"]);
  expect(moveMapLayer(order, 0, 2)).toEqual(["segments", "wards", "hotspots"]);
  expect(moveMapLayer(order, 2, -1)).toEqual(["wards", "hotspots", "segments"]);
  expect(moveMapLayer(order, 0, -1)).toBe(order);
  expect(order).toEqual(defaultMapLayerOrder);
});

it("loads all 21,153 unique observed points in lat/lon order, including off-study crashes", () => {
  const data = readPrepared(bytes(crashLayer), crashLayer);
  expect(data.crashPoints).toHaveLength(21153);
  expect(new Set(data.crashPoints!.map((p) => p.id)).size).toBe(21153);
  expect(data.crashPoints![0]).toMatchObject({
    id: "2016-00000027",
    point: [35.221158, -97.439919],
    year: 2016,
    street: "E COMANCHE ST",
    crossStreet: "S CRAWFORD AVE",
    onStudySegment: false,
  });
  const hotspots = crashClusters(data.crashPoints!);
  expect(hotspots.length).toBeLessThan(data.crashPoints!.length / 4);
  expect(hotspots.reduce((total, spot) => total + spot.count, 0)).toBe(21153);
  expect(data.collisions).toHaveLength(0);
  expect(visibleCrashPoints([file(data)])).toHaveLength(21153);
});

it("uses each crash equally without using year, road or study membership as weights", () => {
  const first = point("1"),
    second = { ...point("2"), year: 2016, onStudySegment: true };
  const one = buildCrashDensity([first])!;
  const two = buildCrashDensity([first, second])!;
  expect(two.width).toBe(one.width);
  expect(two.max).toBeCloseTo(one.max * 2, 5);
  for (let i = 0; i < one.values.length; i++)
    expect(two.values[i]).toBeCloseTo(one.values[i] * 2, 5);
  expect(buildCrashDensity([])).toBeUndefined();
  expect(
    crashClusters([first, second]).reduce((sum, c) => sum + c.count, 0),
  ).toBe(2);
});

it("respects layer visibility, upload precedence and explicit segment filters", () => {
  const base = file({ ...emptyInputs(), crashPoints: [point("base")] });
  const upload = file(
    { ...emptyInputs(), crashPoints: [point("upload", "B")] },
    "uploaded",
  );
  expect(visibleCrashPoints([base, upload]).map((p) => p.id)).toEqual([
    "upload",
  ]);
  expect(visibleCrashPoints([base, { ...upload, visible: false }])).toEqual([]);
  expect(visibleCrashPoints([base], new Set(["B"]))).toEqual([]);
  expect(visibleCrashPoints([base], new Set(["A"]))).toHaveLength(1);
  expect(visibleCrashPoints([base], new Set())).toEqual([]);
});

it("places markers halfway along bent geometry, rather than halfway between endpoints", () => {
  const midpoint = segmentMidpoint({
    geometry: [
      [0, 0],
      [0, 2],
      [1, 2],
    ],
  });
  expect(midpoint[0]).toBeCloseTo(0, 5);
  expect(midpoint[1]).toBeCloseTo(1.5, 3);
});

it("joins the published top ten collision ranks to the updated geometry", () => {
  const geometry = readPrepared(bytes(segmentLayer), segmentLayer);
  const rankings = readPrepared(bytes(rankingsName), rankingsName);
  const markers = topSegmentMarkers([file(rankings)], geometry.segments);
  expect(markers).toHaveLength(10);
  expect(markers.map((m) => m.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const book = XLSX.read(bytes(rankingsName), { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json<{
    key: string;
    city_coll_rank: number;
  }>(book.Sheets[book.SheetNames[0]]);
  for (const marker of markers) {
    expect(marker.rank).toBe(
      rows.find((r) => r.key === marker.id)!.city_coll_rank,
    );
    expect(marker.point).toEqual(
      segmentMidpoint(geometry.segments.find((s) => s.id === marker.id)!),
    );
  }
  expect(
    topSegmentMarkers([file(rankings, "base", false)], geometry.segments),
  ).toEqual([]);
});

it("does not double-count the map points or change computed rankings", () => {
  const geometry = readPrepared(bytes(segmentLayer), segmentLayer);
  const rankings = readPrepared(bytes(rankingsName), rankingsName);
  const crashes = readPrepared(bytes(crashLayer), crashLayer);
  const before = runPipeline(combine([file(geometry), file(rankings)]));
  const inputs = combine([file(geometry), file(rankings), file(crashes)]);
  const after = runPipeline(inputs);
  expect(inputs.crashPoints).toHaveLength(21153);
  expect(inputs.collisions).toHaveLength(0);
  expect(after.segments).toEqual(before.segments);
  expect(after.wards).toEqual(before.wards);
  expect(after.diagnostics).toEqual(before.diagnostics);
});

it("adapts Google's pixel radius to roughly 200 metres within its supported bounds", () => {
  expect(heatRadiusPixels(0.06, 700)).toBeCloseTo(
    200 / ((0.06 * 111195) / 700),
  );
  expect(heatRadiusPixels(0.001, 700)).toBe(50);
  expect(heatRadiusPixels(1, 700)).toBe(10);
});

it("rejects duplicate crash IDs and invalid coordinate order/range", () => {
  const features = JSON.parse(bytes(crashLayer).toString()).features.slice(
    0,
    1,
  );
  const parse = (items: unknown[]) =>
    readPrepared(
      new TextEncoder().encode(
        JSON.stringify({ type: "FeatureCollection", features: items }),
      ),
      crashLayer,
    );
  expect(() => parse([features[0], features[0]])).toThrow("Duplicate key");
  expect(() =>
    parse([
      { ...features[0], geometry: { type: "Point", coordinates: [35, -97] } },
    ]),
  ).toThrow("WGS84");
});

it("nearby crashes build a stronger hotspot than separated crashes", () => {
  const first = point("first");
  const nearby = {
    ...point("nearby"),
    point: [35.2201, -97.44] as [number, number],
  };
  const distant = {
    ...point("distant"),
    point: [35.23, -97.44] as [number, number],
  };
  expect(buildCrashDensity([first, nearby])!.max).toBeGreaterThan(
    buildCrashDensity([first, distant])!.max * 1.5,
  );
});

it("stores the crash-location layer visibility", () => {
  const { useFlow } = require("../src/store/useFlow");
  useFlow.setState({ crashPointsVisible: false });
  useFlow.getState().set({ crashPointsVisible: true });
  expect(useFlow.getState().crashPointsVisible).toBe(true);
  expect(useFlow.getState()).not.toHaveProperty("crashHeatmapVisible");
});
