import { expect, test } from "@jest/globals";
import { heatColor, heatRange, heatValue } from "../src/analysis/heatmap";
import type { SegmentResult } from "../src/analysis/types";
import { fileDisplayName } from "../src/services/displayNames";

const rows = (...values: { vc?: number; collisions: number | null }[]) =>
  values as SegmentResult[];
const stops = ["#0000ff", "#ffff00", "#ff0000"];

test("scales actual metric values across their minimum and maximum", () => {
  const segments = rows(
    { vc: 0.1, collisions: 10 },
    { vc: 0.3, collisions: 30 },
    { vc: 0.5, collisions: 50 },
  );
  for (const metric of ["vc", "collisions"] as const) {
    const range = heatRange(segments, metric);
    expect(range).toEqual(
      metric === "vc" ? { min: 0.1, max: 0.5 } : { min: 10, max: 50 },
    );
    expect(
      heatColor(heatValue(segments[0], metric), range, stops, "gray"),
    ).toBe("#0000ff");
    expect(
      heatColor(heatValue(segments[1], metric), range, stops, "gray"),
    ).toBe("#ffff00");
    expect(
      heatColor(heatValue(segments[2], metric), range, stops, "gray"),
    ).toBe("#ff0000");
  }
});

test("keeps zero collisions and ignores missing or nonfinite measurements", () => {
  const segments = rows(
    { collisions: null },
    { vc: NaN, collisions: 0 },
    { vc: Infinity, collisions: 8 },
  );
  expect(heatRange(segments, "vc")).toBeUndefined();
  expect(heatRange(segments, "collisions")).toEqual({ min: 0, max: 8 });
  expect(heatValue(segments[0], "collisions")).toBeUndefined();
  expect(heatColor(undefined, { min: 0, max: 8 }, stops, "gray")).toBe("gray");
  expect(heatRange([], "vc")).toBeUndefined();
});

test("uses a consistent midpoint when every value is equal and rescales filtered data", () => {
  expect(heatColor(4, { min: 4, max: 4 }, stops, "gray")).toBe("#ffff00");
  expect(
    heatRange(rows({ collisions: 20 }, { collisions: 30 }), "collisions"),
  ).toEqual({ min: 20, max: 30 });
});

test("changes only bundled file display names without mutating filenames", () => {
  const file = { name: "norman_wards.geojson", source: "base" };
  expect(fileDisplayName(file)).toBe("Ward map");
  expect(file.name).toBe("norman_wards.geojson");
  expect(
    fileDisplayName({ name: "norman_segments.geojson", source: "base" }),
  ).toBe("Segments");
  expect(
    fileDisplayName({ name: "norman_flow_rankings.csv", source: "base" }),
  ).toBe("Priority rankings");
  expect(fileDisplayName({ ...file, source: "uploaded" })).toBe(file.name);
  expect(fileDisplayName({ name: "other.csv", source: "base" })).toBe(
    "other.csv",
  );
});
