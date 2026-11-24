// "See its rank" from the map: the target row opens expanded and outlined.
import { expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { runPipeline } from "../src/analysis/pipeline";
import { emptyInputs, type SegmentResult } from "../src/analysis/types";
import { rankSegments } from "../src/analysis/rankings";
import Rankings from "../src/app/(tabs)/ranks";
import { SegmentRow } from "../src/components/SegmentRow";
import { useFlow } from "../src/store/useFlow";

jest.mock("../src/store/storage", () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("../src/services/download", () => ({ download: jest.fn() }));
jest.mock("../src/components/Sheet", () => ({
  Sheet: ({
    visible,
    children,
  }: {
    visible: boolean;
    children: React.ReactNode;
  }) => (visible ? children : null),
}));
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

it("sorts ranking metrics in both directions for a ward and citywide", async () => {
  const results = runPipeline(emptyInputs());
  results.segments = [
    { ...segment, id: "A", road: "First Road" },
    { ...segment, id: "B", road: "Second Road", vc: 0.5, collisions: 30 },
    {
      ...segment,
      id: "C",
      road: "Third Road",
      wards: [4],
      vc: 0.2,
      collisions: 2,
    },
  ];
  results.wards[3] = rankSegments(
    results.segments.filter((s) => s.wards.includes(3)),
  );
  useFlow.setState({ results, ward: 3 });
  await render(<Rankings />);

  const firstRank = () =>
    screen.getAllByRole("button", { name: /^Rank \d+:/ })[0].props
      .accessibilityLabel;
  const choose = async (control: string, option: string) => {
    await fireEvent.press(screen.getByRole("button", { name: control }));
    await fireEvent.press(screen.getByRole("button", { name: option }));
  };
  await choose("Sort by Final rank", "Combined score");
  expect(firstRank()).toMatch(/^Rank 1: First Road/);
  await choose("Sort order: Lowest to highest", "Highest to lowest");
  expect(firstRank()).toMatch(/^Rank 2: Second Road/);
  await fireEvent.press(screen.getByRole("button", { name: "All wards" }));
  expect(firstRank()).toMatch(/^Rank 3: Third Road/);

  let activeSort = "Final rank";
  for (const metric of ["V/C ratio", "Collisions"]) {
    await fireEvent.press(screen.getByRole("tab", { name: metric }));
    await choose(`Sort by ${activeSort}`, metric);
    activeSort = metric;
    expect(firstRank()).toMatch(/^Rank 1: First Road/);
    await choose("Sort order: Highest to lowest", "Lowest to highest");
    expect(firstRank()).toMatch(/^Rank 3: Third Road/);
    await fireEvent.press(screen.getByRole("button", { name: "Ward 3" }));
    expect(firstRank()).toMatch(/^Rank 2: Second Road/);
    await choose("Sort order: Lowest to highest", "Highest to lowest");
    expect(firstRank()).toMatch(/^Rank 1: First Road/);
    await fireEvent.press(screen.getByRole("button", { name: "All wards" }));
  }
});
