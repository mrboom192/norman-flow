// Which rankings are on screen: the bundled official results, an imported
// results file, an in-app (unofficial) calculation, or a what-if preset.
import type { Results, Settings } from "../analysis/types";
import type { DatasetFile } from "../store/useFlow";

export type DatasetKind = "official" | "imported" | "unofficial" | "none";
export type Dataset = {
  kind: DatasetKind;
  /** "Viewing: …" line for banners. */
  viewing: string;
  /** Set when a custom capacity preset is active. */
  whatIf?: string;
  /** Short tag for export file names, e.g. "Official-2026". */
  fileTag: string;
  /** One-line description for export headers. */
  header: string;
};

export function describeDataset(
  results: Results | null,
  files: DatasetFile[],
  settings?: Settings,
): Dataset {
  const preset = settings?.capacityPreset;
  const whatIf = preset
    ? `What-if view: capacities from “${preset.name}”. These are not the official rankings.`
    : undefined;
  const presetTag = preset
    ? `-WhatIf-${preset.name.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "")}`
    : "";
  const imported = [...files]
    .reverse()
    .find((f) => f.source !== "base" && f.data.summaries);
  const raw = files.some(
    (f) =>
      f.source !== "base" &&
      (f.data.traffic.length || f.data.collisions.length),
  );
  const base: Omit<Dataset, "fileTag" | "header" | "whatIf"> = !results
    ? { kind: "none", viewing: "No rankings loaded yet." }
    : raw || (!imported && !results.official && !preset)
      ? {
          kind: "unofficial",
          viewing: "Viewing: unofficial rankings calculated in the app.",
        }
      : imported
        ? {
            kind: "imported",
            viewing: `Viewing: new rankings, imported ${new Date(
              imported.importedAt ?? results.runAt,
            ).toLocaleDateString()} from ${imported.name}.`,
          }
        : { kind: "official", viewing: "Viewing: official 2026 rankings." };
  const tag =
    base.kind === "official"
      ? "Official-2026"
      : base.kind === "imported"
        ? "Imported"
        : "Unofficial";
  return {
    ...base,
    whatIf,
    fileTag: tag + presetTag,
    // Under a what-if preset the rankings aren't official, only the file is.
    header: [
      whatIf && base.kind === "official"
        ? "Dataset: official 2026 results file."
        : base.viewing.replace(/^Viewing: /, "Dataset: "),
      whatIf,
    ]
      .filter(Boolean)
      .join(" "),
  };
}
