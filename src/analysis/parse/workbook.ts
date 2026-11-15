import * as XLSX from "xlsx";
import { Collision, Traffic, RawRow } from "../types";
import {
  Aliases,
  coordinate,
  get,
  number,
  requireColumns,
  str,
} from "./columns";
export function parseVolume(value: unknown) {
  const text = str(value);
  const parts = [...text.matchAll(/([\d,]+(?:\.\d+)?)\s*vpd/gi)];
  return parts.length
    ? parts.reduce((sum, m) => sum + Number(m[1].replace(/,/g, "")), 0)
    : number(value);
}
export function parseWorkbook(
  data: Uint8Array,
  source: string,
  aliases: Aliases = {},
  forceKind?: "traffic" | "collisions",
) {
  const book = XLSX.read(data, { type: "array" });
  const sheets = Object.fromEntries(
    book.SheetNames.map((name) => [
      name,
      XLSX.utils.sheet_to_json<RawRow>(book.Sheets[name], { defval: "" }),
    ]),
  );
  const traffic: Traffic[] = [],
    collisions: Collision[] = [];
  const collisionSheets = book.SheetNames.filter((n) =>
    /base.?data|raw.*(collision|base)|pdicollision/i.test(n),
  );
  const rawTraffic = book.SheetNames.filter((n) => /raw[_ ]?fy/i.test(n));
  const trafficSheets = rawTraffic.length
    ? rawTraffic
    : book.SheetNames.filter((n) => /traffic_combined/i.test(n));
  const selected = [
    ...collisionSheets.map((name) => ({ name, kind: "collisions" as const })),
    ...trafficSheets.map((name) => ({ name, kind: "traffic" as const })),
  ];
  if (!selected.length) {
    const name = book.SheetNames[0];
    const row = sheets[name]?.[0];
    if (!row) throw new Error(`${source} has no data rows.`);
    const kind =
      forceKind ??
      (Object.keys(row).some((h) =>
        /accidentnumber|casenumber/i.test(h.replace(/\s/g, "")),
      )
        ? "collisions"
        : "traffic");
    selected.push({ name, kind });
  }
  const relatedIndex = new Map<string, Record<string, RawRow[]>>();
  for (const [sheetName, records] of Object.entries(sheets)) {
    if (selected.some((s) => s.name === sheetName)) continue;
    for (const record of records) {
      const id = str(get(record, "id", aliases));
      if (!id) continue;
      const tables = relatedIndex.get(id) ?? {};
      (tables[sheetName] ??= []).push(record);
      relatedIndex.set(id, tables);
    }
  }
  for (const { name, kind } of selected) {
    const rows = sheets[name];
    if (!rows.length) continue;
    requireColumns(
      rows,
      kind === "traffic"
        ? ["road", "volume", "latitude", "longitude"]
        : ["road", "id"],
      aliases,
      name,
    );
    rows.forEach((row, index) => {
      const road =
        kind === "traffic"
          ? str(get(row, "road", aliases))
          : ["prefix", "road", "type", "suffix"]
              .map((f) => str(get(row, f as "road", aliases)))
              .filter(Boolean)
              .join(" ");
      const yearValue =
        number(get(row, "year", aliases)) ??
        number(name.match(/FY\s*(\d{2,4})/i)?.[1]);
      const year =
        yearValue != null && yearValue < 100 ? 2000 + yearValue : yearValue;
      const id =
        str(get(row, "id", aliases)) || `${source}:${name}:${index + 2}`;
      const base = {
        id,
        road,
        year,
        point: coordinate(row, aliases),
        source,
        raw: { ...row, Source_Sheet: name, Source_Row: index + 2 },
      };
      if (kind === "traffic")
        traffic.push({
          ...base,
          volume: parseVolume(get(row, "volume", aliases)),
        });
      else {
        const related = relatedIndex.get(id) ?? {};
        collisions.push({
          ...base,
          crossRoad: ["crossPrefix", "crossRoad", "crossType", "crossSuffix"]
            .map((f) => str(get(row, f as "road", aliases)))
            .filter(Boolean)
            .join(" "),
          fromAt: str(get(row, "fromAt", aliases)),
          direction: str(get(row, "direction", aliases)),
          distanceFt: number(get(row, "distance", aliases)) ?? 0,
          related,
        });
      }
    });
  }
  return { traffic, collisions, rawSheets: sheets };
}
