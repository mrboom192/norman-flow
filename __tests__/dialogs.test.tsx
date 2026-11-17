// Section D component tests: reset dialogs, the official preset's Save,
// accent-colored buttons and the dataset banner.
import { beforeEach, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { officialPresetId } from "../src/analysis/capacity";
import { emptyInputs, type Results } from "../src/analysis/types";
import { CapacityPresets } from "../src/components/CapacityPresets";
import { DatasetBanner } from "../src/components/DatasetBanner";
import {
  ResetAliasesButton,
  ResetMapButton,
} from "../src/components/ResetActions";
import { Button } from "../src/components/ui";
import { dialogs } from "../src/config/dialogs";
import { type DatasetFile, useFlow } from "../src/store/useFlow";
import { appColors } from "../src/theme/palette";

jest.mock("../src/store/storage", () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
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
// Bundled assets (PDF, GeoJSON) aren't loadable in Jest.
jest.mock("../src/services/bundledFiles", () => ({
  acogPdf: { name: "acog.pdf", label: "ACOG PDF", module: 1, mimeType: "" },
  openBundledFile: jest.fn(async () => {}),
  bundledDataFile: () => undefined,
}));

const results = (official = true): Results => ({
  official,
  runAt: "2026-11-17T00:00:00.000Z",
  segments: [],
  wards: {},
  unmatched: [],
  diagnostics: {
    countsMatched: 0,
    countsUnmatched: 0,
    collisionsMatched: 0,
    collisionsUnmatched: 0,
    laneChecks: 0,
  },
  settings: useFlow.getState().settings,
  sources: [],
});
const upload: DatasetFile = {
  source: "uploaded",
  name: "added.csv",
  type: "CSV",
  summary: "",
  data: emptyInputs(),
  visible: true,
};

beforeEach(() => {
  useFlow.setState({
    files: [],
    results: results(),
    previous: null,
    aliases: {},
    capacityPresets: [],
  });
});

it("D2: Reset map asks first; Cancel changes nothing; Reset calls the reset", async () => {
  const resetMap = jest.fn();
  useFlow.setState({ resetMap, files: [upload] });
  await render(<ResetMapButton />);
  await fireEvent.press(screen.getByText("Reset map"));
  expect(screen.getByText(dialogs.resetMap.title)).toBeTruthy();
  expect(screen.getByText(dialogs.resetMap.body)).toBeTruthy();

  await fireEvent.press(screen.getByText("Cancel"));
  expect(screen.queryByText(dialogs.resetMap.title)).toBeNull();
  expect(resetMap).not.toHaveBeenCalled();
  expect(useFlow.getState().files).toEqual([upload]);

  await fireEvent.press(screen.getByText("Reset map"));
  await fireEvent.press(screen.getByText("Reset"));
  expect(resetMap).toHaveBeenCalledTimes(1);
});

it("D2: the Reset map button is red", async () => {
  await render(<ResetMapButton />);
  const button = screen.getByRole("button", { name: "Reset map" });
  expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(
    "#C62828",
  );
});

it("D2: Reset column aliases asks first; Cancel keeps them; Reset clears them", async () => {
  useFlow.setState({ aliases: { road: ["Street Name"] } });
  await render(<ResetAliasesButton />);
  await fireEvent.press(screen.getByText("Reset custom column aliases"));
  expect(screen.getByText(dialogs.resetAliases.title)).toBeTruthy();
  await fireEvent.press(screen.getByText("Cancel"));
  expect(useFlow.getState().aliases).toEqual({ road: ["Street Name"] });

  await fireEvent.press(screen.getByText("Reset custom column aliases"));
  await fireEvent.press(screen.getByText("Reset"));
  expect(useFlow.getState().aliases).toEqual({});
});

it("D2/D4: capacity editor — official Save is disabled; Reset asks first and restores ACOG values", async () => {
  await render(<CapacityPresets mode="edit" onMode={() => {}} />);
  expect(
    screen.getByText("The official preset can’t be changed. Use Save as new."),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Save" }).props.accessibilityState,
  ).toMatchObject({ disabled: true });

  const field = screen.getByLabelText("2-lane arterial LOS E capacity");
  await fireEvent.changeText(field, "25000");
  await fireEvent.press(screen.getByText("Reset LOS E capacities"));
  expect(screen.getByText(dialogs.resetCapacities.title)).toBeTruthy();
  expect(screen.getByText("Save first")).toBeTruthy();

  await fireEvent.press(screen.getByText("Cancel"));
  expect(
    screen.getByLabelText("2-lane arterial LOS E capacity").props.value,
  ).toBe("25000");

  await fireEvent.press(screen.getByText("Reset LOS E capacities"));
  await fireEvent.press(screen.getByText("Reset"));
  expect(
    screen.getByLabelText("2-lane arterial LOS E capacity").props.value,
  ).toBe("17100");
  expect(useFlow.getState().capacityPresets).toEqual([]);
});

it("D5: themed buttons follow the selected accent color immediately", async () => {
  await render(
    <>
      <Button label="Add or replace files" onPress={() => {}} />
      <Button label="Replay tutorial" onPress={() => {}} />
    </>,
  );
  for (const [, color] of appColors) {
    useFlow.setState({ primary: color });
    await screen.rerender(
      <>
        <Button label="Add or replace files" onPress={() => {}} />
        <Button label="Replay tutorial" onPress={() => {}} />
      </>,
    );
    for (const label of ["Add or replace files", "Replay tutorial"])
      expect(
        StyleSheet.flatten(
          screen.getByRole("button", { name: label }).props.style,
        ).backgroundColor,
      ).toBe(color);
  }
});

it("D7: the banner says official by default, and offers a way back after an import", async () => {
  await render(<DatasetBanner />);
  expect(screen.getByText("Viewing: official 2026 rankings.")).toBeTruthy();
  expect(screen.queryByText("Switch to official 2026")).toBeNull();

  const restoreOfficial = jest.fn();
  useFlow.setState({
    restoreOfficial,
    files: [
      {
        ...upload,
        name: "norman_flow_rankings 2027.csv",
        importedAt: "2026-11-17T12:00:00.000Z",
        data: { ...emptyInputs(), summaries: [] },
      },
    ],
  });
  await screen.rerender(<DatasetBanner />);
  expect(
    screen.getByText(
      /^Viewing: new rankings, imported .+ from norman_flow_rankings 2027\.csv\.$/,
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByText("Switch to official 2026"));
  expect(restoreOfficial).toHaveBeenCalled();
});

it("the what-if banner offers Back to official", async () => {
  const applyPreset = jest.fn();
  useFlow.setState({
    applyPreset,
    settings: {
      ...useFlow.getState().settings,
      capacityPreset: {
        id: "p",
        name: "Test",
        values: {},
        createdAt: "",
        updatedAt: "",
      },
    },
  });
  await render(<DatasetBanner />);
  expect(
    screen.getByText(
      "What-if view: capacities from “Test”. These are not the official rankings.",
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByText("Back to official"));
  expect(applyPreset).toHaveBeenCalledWith(officialPresetId);
});
