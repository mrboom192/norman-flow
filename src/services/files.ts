import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import { readPrepared } from "../analysis/parse/prepared";
import {
  rankingsName,
  segmentLayer,
  wardLayer,
  crashLayer,
  preparedParserVersion,
} from "../analysis/prepared";
import { type CrashPoint, emptyInputs } from "../analysis/types";
import { Aliases } from "../analysis/parse/columns";
import { parseKml } from "../analysis/parse/kml";
import { parseWorkbook } from "../analysis/parse/workbook";
import { DatasetFile } from "../store/useFlow";
export type Picked = { name: string; bytes: Uint8Array };
export async function pickFiles(
  onRead?: (name: string, index: number, total: number) => Promise<void>,
): Promise<Picked[]> {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    type: "*/*",
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  const files: Picked[] = [];
  for (const [index, asset] of result.assets.entries()) {
    await onRead?.(asset.name, index + 1, result.assets.length);
    const bytes =
      Platform.OS === "web"
        ? new Uint8Array(
            (await (asset.file
              ? asset.file.arrayBuffer()
              : fetch(asset.uri).then((r) => r.arrayBuffer()))) as ArrayBuffer,
          )
        : await new File(asset.uri).bytes();
    files.push({ name: asset.name, bytes });
  }
  return files;
}
/**
 * Which official file this is, by name or by content, so a renamed export
 * (e.g. "norman_flow_rankings (2027).csv") is still recognized.
 */
export function detectPrepared(file: Picked): string | undefined {
  if ([rankingsName, segmentLayer, wardLayer, crashLayer].includes(file.name))
    return file.name;
  if (/\.(csv|xlsx|xls)$/i.test(file.name)) {
    try {
      const book = XLSX.read(file.bytes, { type: "array", sheetRows: 2 });
      const [header = []] = XLSX.utils.sheet_to_json<string[]>(
        book.Sheets[book.SheetNames[0]],
        { header: 1 },
      );
      const columns = new Set(header.map((h) => String(h).trim()));
      // The Excel tool's results file always has a key and ward_ranks column.
      if (
        columns.has("key") &&
        (columns.has("ward_ranks") || columns.has("vc"))
      )
        return rankingsName;
    } catch {
      return undefined;
    }
  }
  if (/\.(geo)?json$/i.test(file.name)) {
    const feature = JSON.parse(new TextDecoder().decode(file.bytes))
      ?.features?.[0];
    const type = feature?.geometry?.type,
      props = feature?.properties ?? {};
    if (type === "LineString" && "key" in props) return segmentLayer;
    if (/Polygon/.test(type ?? "") && "ward_num" in props) return wardLayer;
    if (type === "Point" && "on_study_segment" in props) return crashLayer;
  }
  return undefined;
}

// Norman's bounding box for raw crash coordinates used on the hotspot map.
const inNorman = ([lat, lon]: [number, number]) =>
  lat >= 35 && lat <= 35.5 && lon >= -97.7 && lon <= -97;
const privateProperty = (raw: Record<string, unknown>) =>
  Object.entries(raw).some(
    ([k, v]) =>
      /private/i.test(k) && /^(y|yes|true|1|x)$/i.test(String(v).trim()),
  );

/** " · 2016–2026" from the points' known years, or "" when none are known. */
export function crashYears(points: CrashPoint[]) {
  const years = points.map((p) => p.year).filter((y) => y > 0);
  if (!years.length) return "";
  const first = Math.min(...years),
    last = Math.max(...years);
  return ` · ${first === last ? first : `${first}–${last}`}`;
}

export async function parseFile(
  file: Picked,
  aliases: Aliases = {},
  kind?: "traffic" | "collisions",
  onProgress?: (percent: number) => void,
  { advanced = true }: { advanced?: boolean } = {},
): Promise<DatasetFile> {
  const data = emptyInputs();
  let rawSheets;
  const prepared = detectPrepared(file);
  if (prepared)
    // Records use the canonical layer name so joins work for renamed files.
    Object.assign(data, readPrepared(file.bytes, prepared));
  else if (/\.(kmz|kml)$/i.test(file.name)) {
    if (!advanced)
      throw new Error(
        `${file.name} is a raw road file. Import the Excel tool's results (norman_flow_rankings.csv, plus norman_segments.geojson for new roads), or turn on Advanced (unofficial).`,
      );
    Object.assign(data, await parseKml(file.bytes, file.name, onProgress));
  } else if (/\.(xlsx|xls|csv)$/i.test(file.name)) {
    const parsed = parseWorkbook(file.bytes, file.name, aliases, kind);
    if (advanced) {
      data.traffic = parsed.traffic;
      data.collisions = parsed.collisions;
      rawSheets = parsed.rawSheets;
    } else if (parsed.collisions.length && !parsed.traffic.length) {
      // Official mode: a raw crash sheet only refreshes the hotspot map. It never
      // changes collision counts or ranks.
      data.crashPoints = parsed.collisions
        .filter((c) => c.point && inNorman(c.point) && !privateProperty(c.raw))
        .map((c): CrashPoint => ({
          id: c.id,
          point: c.point!,
          year: c.year ?? 0,
          date: "",
          street: c.road,
          crossStreet: c.crossRoad,
          segment: "",
          onStudySegment: false,
          source: crashLayer,
        }));
      if (!data.crashPoints.length)
        throw new Error(
          `${file.name} has no crash coordinates inside Norman (Lat 35.0–35.5, Lon −97.7 to −97.0) for the hotspot map.`,
        );
    } else
      throw new Error(
        `${file.name} looks like raw traffic data. The official rankings come from the Norman Flow Excel tool: run it with this data, then import the norman_flow_rankings.csv it creates. To recalculate in the app instead, turn on Advanced (unofficial).`,
      );
  } else
    throw new Error(
      "Choose the results CSV from the Norman Flow Excel tool, or a Norman segments, wards or crash-points GeoJSON file.",
    );
  const summary = [
    data.crashPoints?.length
      ? `${data.crashPoints.length.toLocaleString()} crash locations${crashYears(data.crashPoints)}`
      : "",
    data.summaries?.length
      ? data.summaries.length + " ranked segments (official results)"
      : "",
    data.segments.length
      ? `${data.segments.length.toLocaleString()} segments`
      : "",
    data.wards.length
      ? `${new Set(data.wards.map((w) => w.id)).size} ward boundaries`
      : "",
    data.traffic.length
      ? `${data.traffic.length.toLocaleString()} traffic counts`
      : "",
    data.collisions.length
      ? `${data.collisions.length.toLocaleString()} collision rows`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    source: "uploaded",
    name: file.name,
    type: file.name.split(".").pop()!.toUpperCase(),
    data,
    rawSheets,
    summary,
    parserVersion: preparedParserVersion,
    importedAt: new Date().toISOString(),
    visible: true,
  };
}
