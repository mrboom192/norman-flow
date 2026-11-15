import { expect, it } from "@jest/globals";
import { parseState } from "../src/store/serialization";

it("loads legacy compressed geometry and restores its shared references", () => {
  const geometry = [
    [35, -97],
    [36, -97],
  ];
  const saved = {
    files: [{ geometry: { __normanFlowGeometry: 0, points: geometry } }],
    results: [{ geometry: { __normanFlowGeometry: 0 } }],
  };
  const restored = parseState(JSON.stringify(saved));
  expect(restored.files[0].geometry).toEqual(geometry);
  expect(restored.results[0].geometry).toBe(restored.files[0].geometry);
});

it("still loads original uncompressed app snapshots", () => {
  const value = {
    state: {
      files: [
        {
          geometry: [
            [35, -97],
            [36, -97],
          ],
        },
      ],
    },
    version: 0,
  };
  expect(parseState(JSON.stringify(value))).toEqual(value);
});
