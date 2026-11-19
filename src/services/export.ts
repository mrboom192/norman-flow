import { rankSegments } from "../analysis/rankings";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { Results, SegmentResult } from "../analysis/types";
export async function exportWorkbook(
  result: Results,
  ward?: number | "citywide",
  /** e.g. "Dataset: base data (official 2026 results)." Shown as the first row of each ranking sheet. */
  datasetHeader?: string,
): Promise<Uint8Array> {
  const workbook = XLSX.utils.book_new();
  const columns = [
    "Rank",
    "Road segment",
    "V/C ratio",
    "Collisions",
    "Highest traffic count",
    "Count year",
    "LOS E capacity",
    "V/C rank",
    "Collision rank",
    "Combined score",
  ];
  const row = (s: SegmentResult, kind: "combined" | "vc" | "collisions") => [
    kind === "combined"
      ? s.combinedRank
      : kind === "vc"
        ? s.vcRank
        : s.collisionRank,
    `${s.road} · ${s.index} of ${s.of}`,
    s.vc,
    s.collisions,
    s.maxVolume,
    s.volumeYear,
    s.capacity,
    s.vcRank,
    s.collisionRank,
    s.combinedScore,
  ];
  for (const n of ward === "citywide"
    ? [0]
    : ward
      ? [ward]
      : [1, 2, 3, 4, 5, 6, 7, 8]) {
    const lists = n === 0 ? rankSegments(result.segments) : result.wards[n];
    const data: unknown[][] = [
      ...(datasetHeader ? [[datasetHeader]] : []),
      [
        "Combined",
        ...Array(10).fill(""),
        "V/C ratio",
        ...Array(10).fill(""),
        "Collisions",
      ],
      [...columns, "", ...columns, "", ...columns],
    ];
    for (
      let i = 0;
      i <
      Math.max(lists.combined.length, lists.vc.length, lists.collisions.length);
      i++
    )
      data.push([
        ...(lists.combined[i]
          ? row(lists.combined[i], "combined")
          : Array(10).fill("")),
        "",
        ...(lists.vc[i] ? row(lists.vc[i], "vc") : Array(10).fill("")),
        "",
        ...(lists.collisions[i] ? row(lists.collisions[i], "collisions") : []),
      ]);
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet["!cols"] = Array.from({ length: 32 }, (_, i) => ({
      wch: i % 11 === 1 ? 36 : 18,
    }));
    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      n === 0 ? "Citywide" : `Ward ${n}`,
    );
  }
  const plain = (key: string) =>
    key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (s) => s.toUpperCase());
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      result.segments.map((s) =>
        Object.fromEntries(
          Object.entries(s).map(([k, v]) => [
            plain(k),
            typeof v === "object" ? JSON.stringify(v) : v,
          ]),
        ),
      ),
    ),
    "All segments",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      result.unmatched.map((r) => ({
        Type: r.kind,
        ID: r.id,
        Road: r.road,
        "Source file": r.source,
        Reason: r.reason,
        "Original record": JSON.stringify(r.raw),
      })),
      {
        header: [
          "Type",
          "ID",
          "Road",
          "Source file",
          "Reason",
          "Original record",
        ],
      },
    ),
    "Unmatched",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Setting", "Value"],
      ["Run date", result.runAt],
      ...(datasetHeader ? [["Dataset", datasetHeader]] : []),
      [
        "Capacity preset",
        result.settings.capacityPreset?.name ?? "ACOG 2025 LOS E (official)",
      ],
      ["Input files", result.sources.join("; ")],
      ["Match distance (meters)", result.settings.matchDistance],
      ["Capacity table", JSON.stringify(result.settings.capacities)],
      ["Lane overrides", JSON.stringify(result.settings.laneOverrides)],
      [
        "Ranking rules",
        "Highest historical volume; LOS E; competition ranks (shared ties: 1, 1, 3); lowest combined sum first; higher V/C breaks score ties.",
      ],
    ]),
    "Run info",
  );
  const zip = await JSZip.loadAsync(
    XLSX.write(workbook, { type: "array", bookType: "xlsx" }),
  );
  for (const name of Object.keys(zip.files).filter((n) =>
    /^xl\/worksheets\/sheet\d+\.xml$/.test(n),
  )) {
    let xml = await zip.files[name].async("string");
    const rows =
      Number(name.match(/sheet(\d+)/)?.[1]) <= (ward ? 1 : 8)
        ? 2 + (datasetHeader ? 1 : 0)
        : 1;
    const views = `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${rows}" topLeftCell="A${rows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
    xml = /<sheetViews[\s>]/.test(xml)
      ? xml.replace(/<sheetViews[\s\S]*?<\/sheetViews>/, views)
      : xml.replace(/<sheetData[\s>]/, (m) => views + m);
    zip.file(name, xml);
  }
  return zip.generateAsync({ type: "uint8array" });
}
