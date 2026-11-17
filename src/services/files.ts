import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import { readPrepared } from "../analysis/parse/prepared";
import {
  rankingsName,
  segmentLayer,
  wardLayer,
  crashLayer,
} from "../analysis/prepared";
import { emptyInputs } from "../analysis/types";
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
export async function parseFile(
  file: Picked,
  aliases: Aliases = {},
  kind?: "traffic" | "collisions",
  onProgress?: (percent: number) => void,
): Promise<DatasetFile> {
  const data = emptyInputs();
  let rawSheets;
  if ([rankingsName, segmentLayer, wardLayer, crashLayer].includes(file.name))
    Object.assign(data, readPrepared(file.bytes, file.name));
  else if (/\.(kmz|kml)$/i.test(file.name))
    Object.assign(data, await parseKml(file.bytes, file.name, onProgress));
  else if (/\.(xlsx|xls|csv)$/i.test(file.name)) {
    const parsed = parseWorkbook(file.bytes, file.name, aliases, kind);
    data.traffic = parsed.traffic;
    data.collisions = parsed.collisions;
    rawSheets = parsed.rawSheets;
  } else
    throw new Error(
      "Choose a CSV, XLSX, KML, KMZ or prepared Norman GeoJSON file. PDF and shapefile assets will be connected when supplied.",
    );
  const summary = [
    data.crashPoints?.length
      ? `${data.crashPoints.length.toLocaleString()} crash locations · ${Math.min(...data.crashPoints.map((p) => p.year))}–${Math.max(...data.crashPoints.map((p) => p.year))}`
      : "",
    data.summaries?.length
      ? data.summaries.length + " verified segment summaries"
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
    visible: true,
  };
}
