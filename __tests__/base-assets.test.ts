import { expect, it } from "@jest/globals";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { prepareBaseData } = require("../scripts/prepare-base-data.cjs");

it("discovers optional data assets, updates content hashes and removes stale references", () => {
  const root = mkdtempSync(join(tmpdir(), "norman-base-test-"));
  try {
    mkdirSync(join(root, "src/services"), { recursive: true });
    const folder = join(root, "assets/data/base");
    mkdirSync(folder, { recursive: true });
    const manifest = join(root, "src/services/base-assets.generated.ts");
    expect(prepareBaseData(root)).toEqual([]);
    writeFileSync(join(folder, "Traffic_Counts_FY2027.csv"), "road,volume");
    writeFileSync(join(folder, "~$locked.xlsx"), "ignored");
    writeFileSync(join(folder, "README.md"), "ignored");
    expect(prepareBaseData(root)).toEqual(["Traffic_Counts_FY2027.csv"]);
    const first = readFileSync(manifest, "utf8");
    expect(first).toContain(
      'require("../../assets/data/base/Traffic_Counts_FY2027.csv")',
    );
    writeFileSync(
      join(folder, "Traffic_Counts_FY2027.csv"),
      "road,volume\nMAIN,100",
    );
    prepareBaseData(root);
    expect(readFileSync(manifest, "utf8")).not.toEqual(first);
    rmSync(join(folder, "Traffic_Counts_FY2027.csv"));
    prepareBaseData(root);
    expect(readFileSync(manifest, "utf8")).not.toContain("require(");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
