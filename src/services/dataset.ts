// Which rankings are on screen: the bundled official results, an imported
// results file, an in-app (unofficial) calculation, or a what-if preset.
import type { Results, Settings } from "../analysis/types";
import type { DatasetFile } from "../store/useFlow";

export type DatasetKind = "official" | "imported" | "unofficial" | "none";
export type Dataset = {
  kind: DatasetKind;
  /** "Viewing base data …" line for banners. */
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
  const uploads = files.filter((f) => f.source !== "base" && !f.referenceOnly);
  const raw = uploads.some(
    (f) => f.data.traffic.length || f.data.collisions.length,
  );
  // "file.csv" or "file.csv and 2 more", plus the latest import date.
  const names = uploads.length
    ? uploads[uploads.length - 1].name +
      (uploads.length > 1 ? ` and ${uploads.length - 1} more` : "")
    : "";
  const latest = uploads
    .map((f) => f.importedAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop();
  const added = latest
    ? `, added ${new Date(latest).toLocaleDateString()}`
    : "";
  const base: Omit<Dataset, "fileTag" | "header" | "whatIf"> = !results
    ? { kind: "none", viewing: "No rankings loaded yet." }
    : raw
      ? {
          kind: "unofficial",
          viewing: `Viewing base data plus your uploaded data, recalculated in the app (unofficial): ${names}${added}.`,
        }
      : uploads.length
        ? {
            kind: results.official || preset ? "imported" : "unofficial",
            viewing: `Viewing base data plus your uploaded data: ${names}${added}.`,
          }
        : !results.official && !preset
          ? {
              kind: "unofficial",
              viewing:
                "Viewing base data with changed analysis settings (unofficial).",
            }
          : {
              kind: "official",
              viewing: "Viewing base data (official 2026 results).",
            };
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
        ? "Dataset: base data (official 2026 results file)."
        : base.viewing.replace(/^Viewing /, "Dataset: "),
      whatIf,
    ]
      .filter(Boolean)
      .join(" "),
  };
}
