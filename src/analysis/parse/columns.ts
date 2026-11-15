import defaults from "../../config/columnAliases.json";
import { RawRow } from "../types";
export type Field = keyof typeof defaults;
export type Aliases = Partial<Record<Field, string[]>>;
export const headerKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
export function column(headers: string[], field: Field, aliases: Aliases = {}) {
  return headers.find((h) =>
    [...(aliases[field] ?? []), ...defaults[field]].some(
      (a) => headerKey(h) === headerKey(a),
    ),
  );
}
export function get(row: RawRow, field: Field, aliases: Aliases = {}) {
  const key = column(Object.keys(row), field, aliases);
  return key ? row[key] : undefined;
}
export const str = (v: unknown) => (v == null ? "" : String(v).trim());
export function number(v: unknown): number | undefined {
  if (str(v) === "") return undefined;
  const n = Number(str(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}
export function coordinate(
  row: RawRow,
  aliases: Aliases,
): [number, number] | undefined {
  const lat = number(get(row, "latitude", aliases)),
    lon = number(get(row, "longitude", aliases));
  return lat != null &&
    lon != null &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    (lat !== 0 || lon !== 0)
    ? [lat, lon]
    : undefined;
}
export class MappingError extends Error {
  constructor(
    public fields: Field[],
    public headers: string[],
    public sheet: string,
  ) {
    super(`Choose columns for ${fields.join(", ")} in ${sheet}.`);
  }
}
export function requireColumns(
  rows: RawRow[],
  fields: Field[],
  aliases: Aliases,
  sheet: string,
) {
  const headers = [...new Set(rows.flatMap(Object.keys))];
  const missing = fields.filter((f) => !column(headers, f, aliases));
  if (missing.length) throw new MappingError(missing, headers, sheet);
}
