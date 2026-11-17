import { it, expect } from "@jest/globals";
import { runPipeline } from "../src/analysis/pipeline";
import { Collision, Inputs, Segment, Traffic } from "../src/analysis/types";
import { parseVolume, parseWorkbook } from "../src/analysis/parse/workbook";
import { parseKml } from "../src/analysis/parse/kml";
import { exportWorkbook } from "../src/services/export";
import * as XLSX from "xlsx";
import JSZip from "jszip";
const segment = (patch: Partial<Segment> = {}): Segment => ({
  id: "48TH AVE NE#1",
  road: "48th Ave NE",
  index: 1,
  of: 1,
  lengthMi: 1,
  roadTotalMi: 1,
  wards: [1, 2],
  wardMajority: 1,
  start: [35.25, -97.4],
  end: [35.27, -97.4],
  geometry: [
    [35.25, -97.4],
    [35.27, -97.4],
  ],
  lanes: 2,
  laneCoverage: 100,
  travelDirection: "two-way",
  rankable: true,
  source: "roads.kmz",
  ...patch,
});
const count = (patch: Partial<Traffic> = {}): Traffic => ({
  id: "t1",
  road: "48 th Avenue NE",
  point: [35.255, -97.4],
  volume: 18000,
  year: 2019,
  source: "counts.xlsx",
  raw: {},
  ...patch,
});
const collision = (patch: Partial<Collision> = {}): Collision => ({
  id: "c1",
  road: "48th Ave NE",
  crossRoad: "Franklin Rd",
  fromAt: "From",
  direction: "DirectionNorth",
  distanceFt: 1000,
  source: "collisions.xlsx",
  raw: {},
  related: {},
  ...patch,
});
const inputs = (patch: Partial<Inputs> = {}): Inputs => ({
  segments: [segment()],
  wards: [],
  traffic: [count()],
  collisions: [],
  ...patch,
});
it("takes highest historical volume, shares boundary segments across wards, and creates all eight wards", () => {
  const r = runPipeline(
    inputs({
      traffic: [
        count(),
        count({ id: "t2", volume: 20000, year: 2025 }),
        count({ id: "t3", volume: 19000, year: 2026 }),
      ],
    }),
  );
  expect(Object.keys(r.wards)).toHaveLength(8);
  expect(r.segments[0]).toMatchObject({
    maxVolume: 20000,
    volumeYear: 2025,
    vc: 1.17,
  });
  expect(r.wards[1].vc).toHaveLength(1);
  expect(r.wards[2].vc).toHaveLength(1);
  expect(runPipeline(inputs())).toEqual(runPipeline(inputs()));
});
it("places Franklin & 48th Ave NE + 1000 ft north along StreetName, ignoring misleading GPS", () => {
  const cross = segment({
    id: "FRANKLIN RD#1",
    road: "Franklin Rd",
    geometry: [
      [35.25, -97.41],
      [35.25, -97.39],
    ],
    start: [35.25, -97.41],
    end: [35.25, -97.39],
  });
  const r = runPipeline(
    inputs({
      segments: [segment(), cross],
      collisions: [collision({ point: [35.26, -97.41] })],
    }),
  );
  expect(r.segments.find((s) => s.id === "48TH AVE NE#1")?.collisions).toBe(1);
  expect(r.wards[1].combined[0].combinedScore).toBe(2);
});
it("follows From offsets across segment boundaries and reversed geometry", () => {
  const a = segment({
    geometry: [
      [35.251, -97.4],
      [35.25, -97.4],
    ],
    start: [35.251, -97.4],
    end: [35.25, -97.4],
  });
  const b = segment({
    id: "48TH AVE NE#2",
    index: 2,
    geometry: [
      [35.251, -97.4],
      [35.27, -97.4],
    ],
    start: [35.251, -97.4],
    end: [35.27, -97.4],
  });
  const r = runPipeline(
    inputs({
      segments: [a, b],
      traffic: [count()],
      collisions: [collision({ point: [35.25, -97.4] })],
    }),
  );
  expect(r.segments.find((s) => s.id === b.id)?.collisions).toBe(1);
});
it("deduplicates case numbers and excludes collisions without traffic", () => {
  const c = collision({ point: [35.255, -97.4], fromAt: "At" });
  const r = runPipeline(inputs({ collisions: [c, c] }));
  expect(r.segments[0].collisions).toBe(1);
  const noTraffic = runPipeline(inputs({ traffic: [], collisions: [c] }));
  expect(noTraffic.wards[1].combined).toHaveLength(0);
  expect(noTraffic.unmatched[0].reason).toBe("Segment has no traffic count");
});
it("uses sequential ranks and keeps ward ranks independent", () => {
  const segments = [
    segment(),
    segment({ id: "B#1", road: "B", wards: [1] }),
    segment({ id: "C#1", road: "C", wards: [1] }),
  ];
  const r = runPipeline(
    inputs({
      segments,
      traffic: [
        count(),
        count({ id: "b", road: "B" }),
        count({ id: "c", road: "C", volume: 10000 }),
      ],
      collisions: [
        collision({ fromAt: "At", point: [35.255, -97.4] }),
        collision({ id: "b", road: "B", fromAt: "At", point: [35.255, -97.4] }),
      ],
    }),
  );
  expect(r.wards[1].vc.map((s) => s.vcRank)).toEqual([1, 2, 3]);
  expect(r.wards[2].vc[0].collisionRank).toBe(1);
  for (const ward of Object.values(r.wards)) {
    for (const list of Object.values(ward))
      for (const s of list) expect(s.maxVolume).toBeDefined();
    for (const s of ward.combined)
      expect(s.combinedScore).toBe(s.vcRank! + s.collisionRank!);
  }
  expect(r.segments[0].vcRank).toBeUndefined();
});
it("flags partial lanes, reapplies overrides, and defaults unknown dividers", () => {
  const r = runPipeline(
    inputs({ segments: [segment({ lanes: 4, laneCoverage: 59.4 })] }),
  );
  expect(r.segments[0].capacity).toBe(34200);
  expect(r.segments[0].flags).toContain("Check aerial view");
  expect(
    runPipeline(inputs(), { laneOverrides: { "48TH AVE NE#1": 5 } }).segments[0]
      .capacity,
  ).toBe(36000);
});
it("keeps short roads map-only and excludes combined rows with zero collisions", () => {
  const r = runPipeline(inputs({ segments: [segment({ rankable: false })] }));
  expect(r.segments).toHaveLength(1);
  expect(r.wards[1].vc).toHaveLength(0);
  expect(runPipeline(inputs()).wards[1].combined).toHaveLength(0);
});
it("parses directional vpd without adding speeds or dates", () =>
  expect(
    parseVolume("NB 2,009vpd - 55mph / SB 1,889vpd - 61mph (3/31/23)"),
  ).toBe(3898));
it("reads reordered aliases and prefers Raw_FY over normalized copies", () => {
  const book = XLSX.utils.book_new();
  const rows = [
    {
      longitude: -97.4,
      " new count ": "12,000",
      ON_ROAD: "48th Ave NE",
      latitude: 35.25,
    },
  ];
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.json_to_sheet(rows),
    "Raw_FY27",
  );
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.json_to_sheet(rows),
    "Traffic_Combined",
  );
  const data = parseWorkbook(
    new Uint8Array(XLSX.write(book, { type: "array", bookType: "xlsx" })),
    "traffic.xlsx",
  );
  expect(data.traffic).toHaveLength(1);
  expect(data.traffic[0]).toMatchObject({ volume: 12000, year: 2027 });
});
it("reads KMZ descriptions, lane coverage, folder eligibility and ward polygons", async () => {
  const xml =
    "<kml><Document><Folder><name>02 BLUE</name><Placemark><name>W ROBINSON ST | 2 of 5 | 1 mi</name><description><![CDATA[Road: W ROBINSON ST<br>Wards touched: 1, 2<br>GIS lane count: 4 (59.4%); Not mapped (40.6%)<br>Segment length (miles): 1]]></description><LineString><coordinates>-97.5,35.2 -97.48,35.2</coordinates></LineString></Placemark></Folder><Placemark><name>Ward 1</name><Polygon><outerBoundaryIs><LinearRing><coordinates>-97.6,35.1 -97.3,35.1 -97.3,35.3 -97.6,35.1</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>";
  const zip = new JSZip();
  zip.file("doc.kml", xml);
  const parsed = await parseKml(
    await zip.generateAsync({ type: "uint8array" }),
    "roads.kmz",
  );
  expect(parsed.segments[0]).toMatchObject({
    id: "W ROBINSON ST#2",
    laneCoverage: 59.4,
    lanes: 4,
    wards: [1, 2],
    rankable: true,
  });
  expect(parsed.wards[0].id).toBe(1);
});
it("exports all 11 worksheets and frozen ranking headers", async () => {
  const bytes = await exportWorkbook(runPipeline(inputs()));
  const book = XLSX.read(bytes, { type: "array" });
  expect(book.SheetNames).toHaveLength(11);
  expect(book.SheetNames).toContain("Unmatched");
  const zip = await JSZip.loadAsync(bytes);
  expect(await zip.file("xl/worksheets/sheet1.xml")!.async("string")).toContain(
    'state="frozen"',
  );
});
