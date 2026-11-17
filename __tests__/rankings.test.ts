import { expect, it } from "@jest/globals";
import { rankSegments } from "../src/analysis/rankings";
import { SegmentResult, emptyInputs } from "../src/analysis/types";
import { runPipeline } from "../src/analysis/pipeline";
import { exportWorkbook } from "../src/services/export";
import * as XLSX from "xlsx";

const segment = (
  id: string,
  vc: number,
  collisions: number,
  wards: number[],
): SegmentResult => ({
  id,
  road: id,
  index: 1,
  of: 1,
  lengthMi: 1,
  roadTotalMi: 1,
  wards,
  wardMajority: wards[0],
  start: [35, -97],
  end: [35.01, -97],
  geometry: [
    [35, -97],
    [35.01, -97],
  ],
  lanes: 2,
  laneCoverage: 100,
  travelDirection: "two-way",
  rankable: true,
  source: "synthetic",
  maxVolume: vc * 10000,
  capacity: 10000,
  vc,
  collisions,
  flags: [],
});

it("ranks unique segments citywide, shares ranks for ties and preserves ward ranks", () => {
  const rows = [
    segment("A", 3, 30, [1]),
    segment("B", 2, 20, [1, 2]),
    segment("C", 2, 20, [2]),
    segment("D", 1, 10, [2]),
  ];
  const ward = rankSegments(rows.filter((s) => s.wards.includes(2)));
  const city = rankSegments([...rows, rows[1]]);
  // B and C tie on both metrics, so they share 2nd place and D is 4th.
  expect(ward.vc.map((s) => s.vcRank)).toEqual([1, 1, 3]);
  for (const kind of ["vc", "collisions", "combined"] as const) {
    expect(city[kind].map((s) => s.id)).toEqual(["A", "B", "C", "D"]);
    const field =
      kind === "vc"
        ? "vcRank"
        : kind === "collisions"
          ? "collisionRank"
          : "combinedRank";
    expect(city[kind].map((s) => s[field])).toEqual([1, 2, 2, 4]);
  }
  expect(city.combined.map((s) => s.combinedScore)).toEqual([2, 4, 4, 8]);
  expect(rankSegments([...rows].reverse()).combined.map((s) => s.id)).toEqual(
    city.combined.map((s) => s.id),
  );
  expect(ward.vc[0].vcRank).toBe(1);
  expect(rows[0].vcRank).toBeUndefined();
  expect(
    rankSegments(
      [segment("no-count", 1, 1, [1])].map((s) => ({
        ...s,
        maxVolume: undefined,
      })),
    ).vc,
  ).toEqual([]);
});

it("orders a combined-score tie by higher V/C, then segment ID", () => {
  // Same score (1 + 2 and 2 + 1): the higher-V/C segment is listed first.
  const { combined } = rankSegments([
    segment("LOW-VC", 1, 30, [1]),
    segment("HIGH-VC", 2, 10, [1]),
  ]);
  expect(combined.map((s) => [s.id, s.combinedRank])).toEqual([
    ["HIGH-VC", 1],
    ["LOW-VC", 1],
  ]);
});

it("exports citywide ranks to their own sheet", async () => {
  const result = runPipeline(emptyInputs());
  result.segments = [segment("A", 2, 5, [1, 2]), segment("B", 1, 2, [3])];
  const book = XLSX.read(await exportWorkbook(result, "citywide"), {
    type: "array",
  });
  expect(book.SheetNames).toContain("Citywide");
  const data = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets.Citywide, {
    header: 1,
  });
  expect(data[2].slice(0, 2)).toEqual([1, "A · 1 of 1"]);
  expect(data[3].slice(0, 2)).toEqual([2, "B · 1 of 1"]);
});
