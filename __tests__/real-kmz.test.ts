import { it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { parseKml } from "../src/analysis/parse/kml";
import { runPipeline } from "../src/analysis/pipeline";
import { emptyInputs } from "../src/analysis/types";
import { createFlowStorage } from "../src/store/persistence";

it("imports, saves and reloads the reported Road Segments KMZ without a whole-state string", async () => {
  const bytes = readFileSync(join(__dirname, "fixtures/road-segments.kmz"));
  const parsed = await parseKml(bytes, "Road Segments.kmz");
  expect(parsed.segments).toHaveLength(333);
  expect(new Set(parsed.wards.map((ward) => ward.id)).size).toBe(8);
  const result = runPipeline({ ...emptyInputs(), ...parsed });
  const snapshot = {
    state: { files: [{ data: parsed }], results: result },
    version: 0,
  };
  const data = new Map<string, string>();
  const adapter = createFlowStorage<typeof snapshot.state>({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      expect(value.length).toBeLessThanOrEqual(65536);
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  });
  await adapter.setItem("state", snapshot);
  expect(await adapter.getItem("state")).toEqual(snapshot);
  expect(result.segments).toHaveLength(333);
  expect(
    Object.values(result.wards).every((ward) => ward.combined.length === 0),
  ).toBe(true);
}, 30000);
