// Update 2 (section D): shared ties, capacity presets, dataset labels,
// theme contrast and the chatbot's offline fallback and key safety.
import { beforeAll, beforeEach, expect, it, jest } from "@jest/globals";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  facilityKey,
  officialCapacities,
  officialPreset,
  officialPresetId,
  presetCapacity,
} from "../src/analysis/capacity";
import { buildChatContext } from "../src/analysis/chatContext";
import { computeStats } from "../src/analysis/dataStats";
import { rankedRows } from "../src/analysis/mapViews";
import { runPipeline } from "../src/analysis/pipeline";
import {
  crashLayer,
  rankingsName,
  segmentLayer,
  wardLayer,
} from "../src/analysis/prepared";
import type { CapacityPreset, Results } from "../src/analysis/types";
import { askChat } from "../src/services/aiChat";
import { describeDataset } from "../src/services/dataset";
import { parseFile } from "../src/services/files";
import { combine, type DatasetFile, useFlow } from "../src/store/useFlow";
import { appColors, luminance } from "../src/theme/palette";

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
let base: DatasetFile[];
let official: Results;
beforeAll(async () => {
  base = await Promise.all(
    [rankingsName, segmentLayer, wardLayer, crashLayer].map(async (name) => ({
      ...(await parseFile({ name, bytes: bytes(name) })),
      source: "base" as const,
    })),
  );
  official = runPipeline(combine(base));
});
beforeEach(() => {
  useFlow.setState({
    files: base,
    results: official,
    previous: null,
    settings: official.settings,
    capacityPresets: [],
    aliases: {},
  });
});

// ---- A. Shared ties -------------------------------------------------------

it("A: shared-tie spot checks in Ward 1 and citywide", () => {
  const ward1 = official.wards[1].combined.map((s) => [s.id, s.combinedRank]);
  expect(ward1.slice(0, 4)).toEqual([
    ["CLASSEN BLVD | 03", 1],
    ["12TH AVE NE/SE | 03", 1],
    ["CLASSEN BLVD | 04", 3],
    ["ALAMEDA ST | 01", 3],
  ]);
  const city = rankedRows(official, "combined").map((r) => [r.id, r.rank]);
  expect(city.slice(0, 4)).toEqual([
    ["12TH AVE NE/SE | 04", 1],
    ["LINDSEY ST | 03", 2],
    ["ROBINSON ST | 05", 2],
    [city[3][0], 4],
  ]);
});

// ---- B. Capacity table ----------------------------------------------------

it("B: keeps the ACOG values and adds the City's 3-lane row", () => {
  const e = (k: string) => officialCapacities[k].e;
  expect(
    [
      "2-lane arterial",
      "4-lane arterial, undivided",
      "4-lane arterial, divided",
      "5-lane arterial",
      "6-lane arterial, undivided",
      "6-lane arterial, divided",
      "one-way per lane",
      "4-lane expressway",
      "6-lane expressway",
      "8-lane expressway",
    ].map(e),
  ).toEqual([
    17100, 34200, 38000, 36000, 52300, 58000, 11000, 80000, 125000, 165000,
  ]);
  const threeLane =
    officialCapacities["3-lane arterial (2 lanes + center turn lane)"];
  expect(threeLane.e).toBe(18900);
  expect(threeLane.note).toMatch(/CLASSEN BLVD \| 04 and GRAY ST \| 01/);
});

it("maps every results-file facility to the official table without changing any capacity", () => {
  for (const s of official.segments.filter((s) => s.summarySource)) {
    expect(facilityKey(s.facility!)).toBeDefined();
    expect(presetCapacity(s.facility!, s.capacity!, officialPreset)).toBe(
      s.capacity,
    );
  }
});

// ---- C5. Presets ----------------------------------------------------------

const custom = (): CapacityPreset => ({
  id: "preset-test",
  name: "Two-lane test",
  values: { ...officialPreset.values, "2-lane arterial": 20000 },
  createdAt: "2026-11-17T00:00:00.000Z",
  updatedAt: "2026-11-17T00:00:00.000Z",
});

it("D3: a custom preset changes only V/C-based ranks, and Back to official restores exact values", () => {
  useFlow.getState().savePreset(custom());
  useFlow.getState().applyPreset("preset-test");
  const whatIf = useFlow.getState().results!;
  expect(whatIf.official).toBe(false);

  const before = new Map(official.segments.map((s) => [s.id, s]));
  let changed = 0;
  for (const s of whatIf.segments.filter((s) => s.summarySource)) {
    const o = before.get(s.id)!;
    expect(s.maxVolume).toBe(o.maxVolume);
    expect(s.collisions).toBe(o.collisions);
    if (o.facility === "2-lane arterial") {
      expect(s.capacity).toBe(20000);
      expect(s.vc).toBeCloseTo(s.maxVolume! / 20000, 12);
      changed++;
    } else expect(s.capacity).toBe(o.capacity);
  }
  expect(changed).toBe(66);
  for (let w = 1; w <= 8; w++) {
    const rank = (r: Results) =>
      new Map(r.wards[w].collisions.map((s) => [s.id, s.collisionRank]));
    expect(rank(whatIf)).toEqual(rank(official));
  }
  expect(
    [1, 2, 3, 4, 5, 6, 7, 8].some(
      (w) =>
        JSON.stringify(whatIf.wards[w].vc.map((s) => [s.id, s.vcRank])) !==
        JSON.stringify(official.wards[w].vc.map((s) => [s.id, s.vcRank])),
    ),
  ).toBe(true);

  const banner = describeDataset(whatIf, base, useFlow.getState().settings);
  expect(banner.whatIf).toBe(
    "What-if view: capacities from “Two-lane test”. These are not the official rankings.",
  );
  expect(banner.fileTag).toBe("Official-2026-WhatIf-Two-lane-test");

  useFlow.getState().applyPreset(officialPresetId);
  const back = useFlow.getState().results!;
  expect(back.official).toBe(true);
  expect(back.settings.capacityPreset).toBeUndefined();
  for (const s of back.segments) {
    const o = before.get(s.id)!;
    expect([s.id, s.vc, s.capacity, s.vcRank]).toEqual([
      o.id,
      o.vc,
      o.capacity,
      o.vcRank,
    ]);
  }
  for (let w = 1; w <= 8; w++)
    expect(back.wards[w].combined.map((s) => [s.id, s.combinedRank])).toEqual(
      official.wards[w].combined.map((s) => [s.id, s.combinedRank]),
    );
});

it("D4: the official preset can't be saved over", () => {
  expect(() =>
    useFlow.getState().savePreset({ ...officialPreset, name: "Changed" }),
  ).toThrow(/official preset can't be changed/);
  expect(useFlow.getState().capacityPresets).toEqual([]);
});

it("Reset map removes added data and presets in use, returns to official, and keeps no undo", () => {
  useFlow.getState().savePreset(custom());
  useFlow.getState().applyPreset("preset-test");
  useFlow.setState({
    files: [...base, { ...base[0], source: "uploaded", name: "extra.csv" }],
  });
  useFlow.getState().resetMap();
  const state = useFlow.getState();
  expect(state.files.every((f) => f.source === "base")).toBe(true);
  expect(state.results?.official).toBe(true);
  expect(state.settings.capacityPreset).toBeUndefined();
  expect(state.previous).toBeNull();
});

// ---- C8. Dataset labels ---------------------------------------------------

it("D7: dataset says official by default and new rankings after an import", async () => {
  expect(describeDataset(official, base, official.settings).viewing).toBe(
    "Viewing base data (official 2026 results).",
  );
  const upload = await parseFile({
    name: "norman_flow_rankings 2027.csv",
    bytes: bytes(rankingsName),
  });
  const files = [...base, upload];
  const imported = runPipeline(combine(files));
  const dataset = describeDataset(imported, files, imported.settings);
  expect(dataset.kind).toBe("imported");
  expect(dataset.viewing).toMatch(
    /^Viewing base data plus your uploaded data: norman_flow_rankings 2027\.csv, added .+\.$/,
  );
  expect(dataset.fileTag).toBe("Imported");
});

// ---- C3. Theme contrast ---------------------------------------------------

it("D5: button text stays readable (4.5:1) on every accent color", () => {
  const contrast = (a: string, b: string) => {
    const [x, y] = [luminance(a), luminance(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  for (const [, color] of appColors) {
    // Matches useTheme's onPrimary rule (the same in light and dark mode).
    const text = luminance(color) > 0.179 ? "#171717" : "#FFFFFF";
    expect([color, contrast(color, text) >= 4.5]).toEqual([color, true]);
  }
  expect(contrast("#C62828", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
});

// ---- C7. Data pages -------------------------------------------------------

it("data pages' draft numbers match the bundled data", () => {
  const stats = computeStats(combine(base), official);
  expect(stats).toMatchObject({
    segments: "375",
    roads: "54",
    miles: "366.1",
    medianLength: "0.99 mi",
    standardSegments: "310",
    shortSegments: "40",
    longSegments: "25",
    rankedSegments: "119",
    wards: "8",
    crashPoints: "21,152",
    crashPointsOnSegments: "17,969",
    crashYears: "2016–2026",
    noCount: "234",
    collectorRoads: "22",
  });
});

// ---- C1. AI chatbot -------------------------------------------------------

it("D6: falls back to basic answers when the proxy is missing, unreachable or rate-limited", async () => {
  const ask = (url: string) =>
    askChat({
      question: "How is V/C calculated?",
      history: [],
      context: "",
      results: official,
      url,
    });
  expect(await ask("")).toMatchObject({ mode: "basic" });
  const fetchMock = jest.fn<typeof fetch>();
  global.fetch = fetchMock;
  fetchMock.mockRejectedValueOnce(new Error("offline"));
  expect(await ask("https://proxy.example/chat")).toMatchObject({
    mode: "basic",
    text: expect.stringMatching(/V\/C is the highest/),
  });
  fetchMock.mockResolvedValueOnce(new Response("{}", { status: 429 }));
  expect(await ask("https://proxy.example/chat")).toMatchObject({
    mode: "basic",
  });
});

it("D6: the device sends only question and data to the proxy, never an API key", async () => {
  const fetchMock = jest.fn<typeof fetch>();
  global.fetch = fetchMock;
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        answer: "CLASSEN BLVD | 03 is #1 in Ward 1.",
        sources: ["norman_flow_rankings.csv: ward_ranks"],
      }),
      { status: 200 },
    ),
  );
  const context = buildChatContext({
    inputs: combine(base),
    results: official,
    dataset: "Dataset: base data (official 2026 results).",
  });
  const answer = await askChat({
    question: "What's #1 in Ward 1?",
    history: [],
    context,
    results: official,
    url: "https://proxy.example/chat",
  });
  expect(answer).toMatchObject({
    mode: "ai",
    sources: ["norman_flow_rankings.csv: ward_ranks"],
  });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("https://proxy.example/chat");
  expect(Object.keys(init!.headers as object)).toEqual(["Content-Type"]);
  expect(String(url)).not.toMatch(/key=/i);
  const body = JSON.parse(String(init!.body));
  expect(Object.keys(body).sort()).toEqual(["context", "history", "question"]);
  expect(String(init!.body)).not.toMatch(/AIza|api[_-]?key/i);
  expect(context).toContain("CLASSEN BLVD | 03");
});

it("D6: no API key or Gemini endpoint appears in app code", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx|js|json)$/.test(name)) files.push(path);
    }
  };
  walk(join(__dirname, "../src"));
  files.push(join(__dirname, "../app.json"));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    expect([file, /AIza[0-9A-Za-z_-]{20,}/.test(text)]).toEqual([file, false]);
    expect([
      file,
      /GEMINI_API_KEY|generativelanguage\.googleapis/.test(text),
    ]).toEqual([file, false]);
  }
});
