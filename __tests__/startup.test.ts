import { beforeEach, expect, it, jest } from "@jest/globals";

jest.mock("../src/store/storage", () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));
jest.mock("../src/services/base-assets.generated", () => ({ baseAssets: [] }));
jest.mock("expo-asset", () => ({
  Asset: {
    fromModule: () => ({
      uri: "base.csv",
      localUri: "base.csv",
      downloadAsync: async () => {},
    }),
  },
}));
jest.mock("expo-file-system", () => ({
  File: class {
    async bytes() {
      return new Uint8Array();
    }
  },
}));
jest.mock("../src/services/files", () => ({ parseFile: jest.fn() }));

beforeEach(() => {
  jest.resetModules();
  // Startup yields before synchronous work so the loading screen can paint.
  global.requestAnimationFrame = (callback) => {
    callback(0);
    return 0;
  };
});
function setup() {
  const {
    useFlow,
    combine,
    flowStorage,
    visibleGeometry,
  } = require("../src/store/useFlow");
  const { emptyInputs } = require("../src/analysis/types");
  const { baseAssets } = require("../src/services/base-assets.generated");
  const { parseFile } = require("../src/services/files");
  const { initializeData } = require("../src/services/startup");
  const file = (name: string) => ({
    name,
    type: "CSV",
    visible: true,
    summary: "",
    data: emptyInputs(),
  });
  return {
    useFlow,
    combine,
    flowStorage,
    baseAssets,
    parseFile,
    initializeData,
    file,
    visibleGeometry,
  };
}
it("opens with no data when both sources are empty and reports each startup stage", async () => {
  const { initializeData, useFlow } = setup();
  const report = jest.fn();
  expect(await initializeData(report)).toEqual([]);
  expect(useFlow.getState().hydrated).toBe(true);
  expect(useFlow.getState().files).toEqual([]);
  expect(useFlow.getState().results).toBeNull();
  expect(report.mock.calls.map(([p]) => (p as { step: number }).step)).toEqual([
    0, 1, 2,
  ]);
});
it("loads base files once and retains legacy saved uploads", async () => {
  const { initializeData, useFlow, baseAssets, parseFile, file, flowStorage } =
    setup();
  const upload = file("uploaded.csv");
  useFlow.setState({ files: [upload] });
  baseAssets.push({ name: "base.csv", version: "one", module: 1 });
  parseFile.mockResolvedValue(file("base.csv"));
  const report = jest.fn();
  const first = initializeData(report);
  expect(initializeData(report)).toBe(first);
  expect(await first).toEqual([]);
  const files = useFlow.getState().files;
  expect(files.map((f: { source?: string }) => f.source ?? "uploaded")).toEqual(
    ["base", "uploaded"],
  );
  expect(files[0].baseVersion).toBe("one");
  expect(parseFile).toHaveBeenCalledTimes(1);
  await flowStorage.flush();
});
it("uses cached base files without parsing and drops assets removed from the build", async () => {
  const { preparedParserVersion } = require("../src/analysis/prepared");
  const { initializeData, useFlow, baseAssets, parseFile, file, flowStorage } =
    setup();
  const cached = {
    ...file("base.csv"),
    source: "base",
    baseVersion: "one",
    parserVersion: preparedParserVersion,
  };
  useFlow.setState({ files: [cached, { ...cached, name: "removed.csv" }] });
  baseAssets.push({ name: "base.csv", version: "one", module: 1 });
  expect(await initializeData(jest.fn())).toEqual([]);
  expect(parseFile).not.toHaveBeenCalled();
  expect(useFlow.getState().files).toEqual([cached]);
  await flowStorage.flush();
});
it("reports a broken base file and keeps available uploaded data", async () => {
  const { initializeData, useFlow, baseAssets, parseFile, file, flowStorage } =
    setup();
  const upload = file("uploaded.csv");
  useFlow.setState({ files: [upload] });
  baseAssets.push({ name: "broken.csv", version: "one", module: 1 });
  parseFile.mockRejectedValue(new Error("Missing road column"));
  expect(await initializeData(jest.fn())).toEqual([
    "broken.csv: Missing road column",
  ]);
  expect(useFlow.getState().files).toEqual([upload]);
  await flowStorage.flush();
});
it("prefers uploaded geometry, merges collision IDs and falls back after removal", () => {
  const { combine, file, visibleGeometry } = setup();
  const base = { ...file("roads.kmz"), source: "base" };
  const upload = file("replacement.kmz");
  base.data.segments = [{ id: "base-road" }];
  base.data.wards = [{ id: 1 }];
  base.data.collisions = [
    { id: "case", road: "base", raw: { original: true } },
  ];
  upload.data.segments = [{ id: "uploaded-road" }];
  upload.data.wards = [{ id: 2 }];
  upload.data.collisions = [
    { id: "case", road: "uploaded", raw: { revised: true } },
  ];
  const merged = combine([upload, base]);
  expect(merged.segments).toEqual(upload.data.segments);
  expect(merged.wards).toEqual(upload.data.wards);
  expect(merged.collisions).toHaveLength(1);
  expect(merged.collisions[0].road).toBe("uploaded");
  expect(merged.collisions[0].raw).toEqual({ original: true, revised: true });
  expect(combine([base]).segments).toEqual(base.data.segments);
  expect(visibleGeometry([upload, base]).wards).toEqual(upload.data.wards);
  expect(
    visibleGeometry([{ ...upload, visible: false }, base]).segments,
  ).toEqual([]);
  expect(visibleGeometry([base]).segments).toEqual(base.data.segments);
});

it("re-parses a cached base file from an older parser version", async () => {
  const { initializeData, useFlow, baseAssets, parseFile, file, flowStorage } =
    setup();
  const stale = { ...file("base.csv"), source: "base", baseVersion: "one" };
  useFlow.setState({ files: [stale] });
  parseFile.mockResolvedValue(file("base.csv"));
  baseAssets.push({ name: "base.csv", version: "one", module: 1 });
  await initializeData(jest.fn());
  expect(parseFile).toHaveBeenCalled();
  await flowStorage.flush();
});
