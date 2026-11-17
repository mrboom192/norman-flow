import { it, expect, jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { parseFile } from "../src/services/files";
import { combine } from "../src/store/useFlow";
import {
  rankingsName,
  segmentLayer,
  wardLayer,
} from "../src/analysis/prepared";
import { runPipeline } from "../src/analysis/pipeline";
import { exportWorkbook } from "../src/services/export";
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
async function load() {
  return Promise.all(
    [rankingsName, segmentLayer, wardLayer].map(async (name) => ({
      ...(await parseFile({ name, bytes: bytes(name) })),
      source: "base" as const,
    })),
  );
}
it("preserves bundled metrics and ward memberships with official ranks and exports those results", async () => {
  const files = await load(),
    inputs = combine(files),
    results = runPipeline(inputs);
  const book = XLSX.read(bytes(rankingsName), { type: "buffer" }),
    rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(
      book.Sheets[book.SheetNames[0]],
    );
  expect(inputs.segments).toHaveLength(375);
  expect(inputs.wards).toHaveLength(8);
  expect(rows).toHaveLength(119);
  expect(inputs.traffic).toHaveLength(0);
  expect(inputs.collisions).toHaveLength(0);
  const byId = new Map(results.segments.map((s) => [s.id, s]));
  let memberships = 0;
  for (const row of rows) {
    const segment = byId.get(String(row.key))!;
    expect(segment).toMatchObject({
      road: row.road,
      from: row.from_street,
      to: row.to_street,
      maxVolume: row.volume,
      capacity: row.capacity,
      collisions: row.collisions,
      vc: Number(row.vc),
    });
    for (const [, ward] of String(row.ward_ranks).matchAll(
      /Ward (\d+):(\d+)/g,
    )) {
      memberships++;
      const item = results.wards[Number(ward)].combined.find(
        (s) => s.id === row.key,
      )!;
      expect(item).toBeDefined();
      expect(item.combinedScore).toBe(item.vcRank! + item.collisionRank!);
    }
  }
  expect(
    Object.values(results.wards).reduce((n, w) => n + w.combined.length, 0),
  ).toBe(memberships);
  expect(results.official).toBe(true);
  const unranked = results.segments.filter((s) => !s.publishedRanked);
  expect(unranked).toHaveLength(256);
  expect(
    unranked.every((s) => s.maxVolume === undefined && s.collisions === null),
  ).toBe(true);
  expect(results.sources.sort()).toEqual(
    [rankingsName, segmentLayer, wardLayer].sort(),
  );
  expect(results.segments.reduce((n, s) => n + (s.collisions ?? 0), 0)).toBe(
    16857,
  );
  const exported = XLSX.read(await exportWorkbook(results), { type: "array" });
  expect(exported.SheetNames.length).toBe(11);
  expect(exported.Sheets["Ward 6"].B3.v).toContain("12TH AVE NE/SE");
});
it("rejects inconsistent snapshot keys and does not double count case uploads", async () => {
  const inputs = combine(await load());
  expect(() =>
    runPipeline({ ...inputs, summaries: inputs.summaries!.slice(1) }),
  ).toThrow(/Missing ranking row/);
  const s = inputs.segments.find((s) => s.publishedRanked)!;
  const r = runPipeline({
    ...inputs,
    collisions: [
      {
        id: "case",
        road: s.road,
        crossRoad: "",
        point: s.start,
        fromAt: "At",
        distanceFt: 0,
        direction: "",
        source: "cases.csv",
        raw: {},
        related: {},
      },
    ],
  });
  expect(r.segments.reduce((n, x) => n + (x.collisions ?? 0), 0)).toBe(
    r.diagnostics.collisionsMatched,
  );
});

it("uses a newer raw count on the matching quadrant of a prepared corridor", async () => {
  const inputs = combine(await load()),
    id = "12TH AVE NE/SE | 04";
  const s = inputs.segments.find((x) => x.id === id)!;
  const point = s.geometry[Math.floor(s.geometry.length / 2)];
  const result = runPipeline({
    ...inputs,
    traffic: [
      {
        id: "new station",
        source: "FY27.csv",
        raw: {},
        year: 2027,
        volume: 40000,
        road: "12th Avenue NE",
        point,
      },
    ],
  });
  expect(result.segments.find((x) => x.id === id)).toMatchObject({
    maxVolume: 40000,
    volumeYear: 2027,
    capacity: 34200,
    collisions: 666,
  });
});
