// Acceptance tests for the official results (spec section 8): the app shows
// the Excel tool's results file unchanged, validates it, and maps it live.
import { beforeAll, expect, it, jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import {
  crashLayer,
  rankingsName,
  segmentLayer,
  wardLayer,
} from "../src/analysis/prepared";
import { runPipeline } from "../src/analysis/pipeline";
import { rankedRows, segmentStyle, valueRange } from "../src/analysis/mapViews";
import type { Results } from "../src/analysis/types";
import { parseFile } from "../src/services/files";
import { colors } from "../src/theme";
import { combine, type DatasetFile, useFlow } from "../src/store/useFlow";

jest.mock("../src/store/storage", () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));

const bytes = (name: string) =>
  new Uint8Array(readFileSync(join(__dirname, "../assets/data/base", name)));
const csvRows = () => {
  const book = XLSX.read(bytes(rankingsName), { type: "array", raw: true });
  return XLSX.utils.sheet_to_json<Record<string, string | number>>(
    book.Sheets[book.SheetNames[0]],
  );
};
const toCsv = (rows: Record<string, unknown>[]) =>
  new TextEncoder().encode(
    XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows)),
  );

let base: DatasetFile[];
let results: Results;
beforeAll(async () => {
  base = await Promise.all(
    [rankingsName, segmentLayer, wardLayer, crashLayer].map(async (name) => ({
      ...(await parseFile({ name, bytes: bytes(name) })),
      source: "base" as const,
    })),
  );
  results = runPipeline(combine(base));
});
const rank = (ward: number, key: string) => {
  const lists = results.wards[ward];
  const find = (kind: "vc" | "collisions" | "combined") =>
    lists[kind].find((s) => s.id === key);
  return [
    find("vc")?.vcRank,
    find("collisions")?.collisionRank,
    find("combined")?.combinedRank,
  ];
};

it("1. loads 375 segments (119 ranked, 234 no count, 22 collector) and 8 wards", () => {
  expect(results.segments).toHaveLength(375);
  expect(results.segments.filter((s) => s.publishedRanked)).toHaveLength(119);
  const status = (text: string) =>
    results.segments.filter((s) => s.preparedStatus?.includes(text)).length;
  expect(status("no usable count")).toBe(234);
  expect(status("collector road")).toBe(22);
  expect(combine(base).wards).toHaveLength(8);
});

it("2. ranks the official number of segments in each ward (161 entries)", () => {
  const perWard = [1, 2, 3, 4, 5, 6, 7, 8].map(
    (w) => results.wards[w].vc.length,
  );
  expect(perWard).toEqual([12, 15, 23, 24, 31, 29, 5, 22]);
  expect(perWard.reduce((a, b) => a + b)).toBe(161);
  for (const w of [1, 2, 3, 4, 5, 6, 7, 8])
    for (const kind of ["collisions", "combined"] as const)
      expect(results.wards[w][kind]).toHaveLength(perWard[w - 1]);
});

it("3. matches the file's ward_ranks for all 161 entries", () => {
  expect(results.official).toBe(true);
  let checked = 0;
  for (const row of csvRows())
    for (const [, ward, expected] of String(row.ward_ranks).matchAll(
      /Ward (\d+):(\d+)/g,
    )) {
      expect([row.key, ward, rank(Number(ward), String(row.key))[2]]).toEqual([
        row.key,
        ward,
        Number(expected),
      ]);
      checked++;
    }
  expect(checked).toBe(161);
});

it("4. spot checks: ward V/C, collision and combined ranks, with shared ties", () => {
  expect(rank(4, "12TH AVE NE/SE | 04")).toEqual([2, 2, 1]);
  expect(rank(4, "ROBINSON ST | 05")).toEqual([3, 1, 1]);
  expect(rank(4, "LINDSEY ST | 03")).toEqual([1, 4, 3]);
  expect(rank(7, "LINDSEY ST | 03")).toEqual([1, 1, 1]);
  const lindsey = results.segments.find((s) => s.id === "LINDSEY ST | 03")!;
  expect(lindsey.vc!.toFixed(2)).toBe("1.06");
  expect(results.wards[7].vc.filter((s) => s.vc! >= 1)).toHaveLength(1);
  expect(rank(1, "CLASSEN BLVD | 03")).toEqual([1, 2, 1]);
  expect(rank(1, "12TH AVE NE/SE | 03")).toEqual([2, 1, 1]);
  expect(rank(3, "MAIN ST | 03")).toEqual([2, 1, 1]);
  expect(
    results.segments.find((s) => s.id === "MAIN ST | 03")!.collisions,
  ).toBe(722);
  expect(rank(6, "12TH AVE NE/SE | 04")).toEqual([1, 1, 1]);
  // Display order in a tie: higher V/C first.
  const top = results.wards[4].combined.slice(0, 2).map((s) => s.id);
  expect(top).toEqual(["12TH AVE NE/SE | 04", "ROBINSON ST | 05"]);
});

it("keeps every CSV value unchanged, with full-precision V/C", () => {
  const byId = new Map(results.segments.map((s) => [s.id, s]));
  for (const row of csvRows())
    expect(byId.get(String(row.key))).toMatchObject({
      maxVolume: Number(row.volume),
      capacity: Number(row.capacity),
      collisions: Number(row.collisions),
      vc: Number(row.vc),
      facility: row.facility,
    });
});

it("citywide ranks match the file's city_* columns", () => {
  for (const [kind, column] of [
    ["vc", "city_vc_rank"],
    ["collisions", "city_coll_rank"],
    ["combined", "city_combined_rank"],
  ] as const) {
    const ranks = new Map(rankedRows(results, kind).map((r) => [r.id, r.rank]));
    for (const row of csvRows())
      expect([row.key, ranks.get(String(row.key))]).toEqual([
        row.key,
        Number(row[column]),
      ]);
  }
});

it("5. swaps GeoJSON coordinates to [lat, lon] inside Norman", () => {
  for (const s of results.segments)
    for (const [lat, lon] of s.geometry) {
      expect(lat).toBeGreaterThanOrEqual(35.1);
      expect(lat).toBeLessThanOrEqual(35.4);
      expect(lon).toBeGreaterThanOrEqual(-97.6);
      expect(lon).toBeLessThanOrEqual(-97.1);
    }
});

it("6. re-importing the same CSV (even renamed) gives identical results; a missing column is rejected", async () => {
  const again = await parseFile({
    name: "norman_flow_rankings (2).csv",
    bytes: bytes(rankingsName),
  });
  const rerun = runPipeline(combine([...base, again]));
  expect(rerun.official).toBe(true);
  for (const w of [1, 2, 3, 4, 5, 6, 7, 8])
    for (const kind of ["vc", "collisions", "combined"] as const)
      expect(
        rerun.wards[w][kind].map((s) => [s.id, s.vcRank, s.combinedRank]),
      ).toEqual(
        results.wards[w][kind].map((s) => [s.id, s.vcRank, s.combinedRank]),
      );
  const missing = csvRows().map(({ ward_ranks: _, ...row }) => row);
  await expect(
    parseFile({ name: rankingsName, bytes: toCsv(missing) }),
  ).rejects.toThrow(/missing column ward_ranks/);
});

it("rejects a results file whose ward_ranks disagree with its values", async () => {
  const rows = csvRows().map((row) =>
    row.key === "MAIN ST | 03" ? { ...row, ward_ranks: "Ward 3:2" } : row,
  );
  const bad = await parseFile({ name: rankingsName, bytes: toCsv(rows) });
  expect(() => runPipeline(combine([...base, bad]))).toThrow(
    /Ward rank check failed for MAIN ST \| 03 in Ward 3/,
  );
});

it("7. Restore official 2026 results brings back the bundled data", async () => {
  const rows = csvRows().map((row) =>
    row.key === "MAIN ST | 03" ? { ...row, ward_ranks: "Ward 3:1" } : row,
  );
  const upload = await parseFile({ name: "custom.csv", bytes: toCsv(rows) });
  useFlow.setState({ files: [...base, upload], results: null });
  useFlow.getState().restoreOfficial();
  const state = useFlow.getState();
  expect(state.files.every((f) => f.source === "base")).toBe(true);
  expect(state.results?.official).toBe(true);
  expect(state.results?.wards[7].combined.map((s) => s.id)).toEqual(
    results.wards[7].combined.map((s) => s.id),
  );
});

it("8. maps: crash points, ward views and live recoloring after import", async () => {
  const points = combine(base).crashPoints!;
  expect(points).toHaveLength(21152);
  expect(points.filter((p) => p.onStudySegment)).toHaveLength(17969);

  const ward7 = rankedRows(results, "combined", 7);
  expect(ward7).toHaveLength(5);
  expect(ward7[0]).toMatchObject({ id: "LINDSEY ST | 03", rank: 1 });

  // Switching the metric changes the colors from the same results.
  const color = (r: Results, metric: "vc" | "collisions", id: string) => {
    const rows = rankedRows(r, metric);
    return segmentStyle(
      rows.find((x) => x.id === id)!,
      metric,
      valueRange(rows),
      colors,
    ).color;
  };
  const mid = rankedRows(results, "vc")[40];
  expect(color(results, "vc", mid.id)).not.toBe(
    color(results, "collisions", mid.id),
  );

  // Import a CSV where one mid-ranked segment's V/C moves within its gap, so
  // no rank changes (the file stays valid) but the segment recolors.
  const sorted = rankedRows(results, "vc");
  const lower = sorted[41].vc!;
  const target = sorted[40];
  const newVc = target.vc! - (target.vc! - lower) * 0.6;
  const rows = csvRows().map((row) =>
    row.key === target.id
      ? {
          ...row,
          volume: newVc * Number(row.capacity),
          vc: (newVc * Number(row.capacity)) / Number(row.capacity),
        }
      : row,
  );
  const upload = await parseFile({ name: rankingsName, bytes: toCsv(rows) });
  const updated = runPipeline(combine([...base, upload]));
  expect(updated.official).toBe(true);
  expect(color(updated, "vc", target.id)).not.toBe(
    color(results, "vc", target.id),
  );
});
