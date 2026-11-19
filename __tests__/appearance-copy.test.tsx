// Colorblind mode, no em dashes in app text, and the "Viewing base data" banner.
import { expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Text } from "react-native";
import { emptyInputs, type Results } from "../src/analysis/types";
import { describeDataset } from "../src/services/dataset";
import type { DatasetFile } from "../src/store/useFlow";
import { useFlow } from "../src/store/useFlow";
import {
  colorblindColors,
  colors,
  segmentLengthColor,
  useTheme,
} from "../src/theme";
import { luminance } from "../src/theme/palette";

jest.mock("../src/store/storage", () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));

function Probe() {
  const c = useTheme();
  return (
    <Text testID="probe">
      {[c.vcScale.join(","), c.segmentShort, segmentLengthColor(2, c)].join(
        "|",
      )}
    </Text>
  );
}

it("colorblind mode switches map and chart colors and back", async () => {
  useFlow.setState({ colorblindMode: false });
  await render(<Probe />);
  expect(screen.getByTestId("probe").props.children).toBe(
    [colors.vcScale.join(","), colors.segmentShort, colors.segmentLong].join(
      "|",
    ),
  );
  useFlow.setState({ colorblindMode: true });
  await screen.rerender(<Probe />);
  expect(screen.getByTestId("probe").props.children).toBe(
    [
      colorblindColors.vcScale.join(","),
      colorblindColors.segmentShort,
      colorblindColors.segmentLong,
    ].join("|"),
  );
});

it("colorblind scales keep the light-to-dark order of the default palette", () => {
  for (const scale of [
    colorblindColors.vcScale,
    colorblindColors.collisionScale,
    colorblindColors.crashHeatColors,
  ]) {
    const l = scale.map(luminance);
    for (let i = 1; i < l.length; i++) expect(l[i]).toBeLessThan(l[i - 1]);
  }
  // Combined tiers run dark (best) to light.
  const tiers = colorblindColors.combinedTiers.map(luminance);
  for (let i = 1; i < tiers.length; i++)
    expect(tiers[i]).toBeGreaterThan(tiers[i - 1]);
});

it("app source has no em dashes", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx|json)$/.test(name)) files.push(path);
    }
  };
  walk(join(__dirname, "../src"));
  const withDashes = files.filter((f) => readFileSync(f, "utf8").includes("—"));
  expect(withDashes).toEqual([]);
});

const results = { official: true, runAt: "" } as Results;
const upload = (name: string, data = emptyInputs()): DatasetFile => ({
  source: "uploaded",
  name,
  type: "GEOJSON",
  summary: "",
  data,
  visible: true,
  importedAt: "2026-11-18T12:00:00.000Z",
});

it("banner says base data, or base data plus uploads for any uploaded file", () => {
  expect(describeDataset(results, []).viewing).toBe(
    "Viewing base data (official 2026 results).",
  );
  const crashes = describeDataset(results, [upload("crashes.geojson")]);
  expect(crashes.kind).toBe("imported");
  expect(crashes.viewing).toMatch(
    /^Viewing base data plus your uploaded data: crashes\.geojson, added .+\.$/,
  );
  expect(
    describeDataset(results, [upload("a.csv"), upload("b.geojson")]).viewing,
  ).toMatch(/: b\.geojson and 1 more, added /);
  const raw = describeDataset({ ...results, official: false }, [
    upload("counts.xlsx", { ...emptyInputs(), traffic: [{} as never] }),
  ]);
  expect(raw.kind).toBe("unofficial");
  expect(raw.viewing).toMatch(/recalculated in the app \(unofficial\)/);
});
