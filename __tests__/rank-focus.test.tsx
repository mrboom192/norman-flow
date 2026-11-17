// "See its rank" from the map: the target row opens expanded and outlined.
import { expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { SegmentResult } from "../src/analysis/types";
import { SegmentRow } from "../src/components/SegmentRow";

jest.mock("../src/store/storage", () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
// lucide ships ESM only; icons don't matter here.
jest.mock(
  "lucide-react-native",
  () =>
    new Proxy(
      {},
      { get: (_t, key) => (key === "__esModule" ? false : () => null) },
    ),
);

const segment: SegmentResult = {
  id: "MAIN ST | 03",
  road: "MAIN ST",
  index: 3,
  of: 8,
  lengthMi: 1,
  roadTotalMi: 8,
  wards: [3],
  wardMajority: 3,
  start: [35.2, -97.4],
  end: [35.21, -97.4],
  geometry: [
    [35.2, -97.4],
    [35.21, -97.4],
  ],
  lanes: 4,
  laneCoverage: 100,
  travelDirection: "two-way",
  rankable: true,
  source: "test",
  maxVolume: 30000,
  capacity: 34200,
  vc: 0.88,
  collisions: 722,
  vcRank: 2,
  collisionRank: 1,
  combinedScore: 3,
  combinedRank: 1,
  flags: [],
};

it("a highlighted row starts expanded and outlined; a normal row starts collapsed", async () => {
  await render(<SegmentRow segment={segment} highlighted />);
  expect(screen.getByText("Show on map")).toBeTruthy();
  const outlined = StyleSheet.flatten(
    screen.getByLabelText("Selected on the map").props.style,
  );
  expect(outlined.borderWidth).toBe(2);

  await screen.rerender(<SegmentRow key="plain" segment={segment} />);
  expect(screen.queryByText("Show on map")).toBeNull();
  expect(screen.queryByLabelText("Selected on the map")).toBeNull();
});
