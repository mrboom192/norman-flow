// LOS E capacity presets. Pure TypeScript: no React Native imports.
import capacity from "../config/capacity.json";
import type { CapacityPreset, CapacityTable } from "./types";

export const officialCapacities = capacity as CapacityTable;
export const officialPresetId = "official";
export const officialPreset: CapacityPreset = {
  id: officialPresetId,
  name: "ACOG 2025 LOS E (official)",
  values: Object.fromEntries(
    Object.entries(officialCapacities).map(([k, v]) => [k, v.e]),
  ),
  createdAt: "",
  updatedAt: "",
};

/**
 * The capacity-table row for a results-file facility, e.g.
 * "4-lane arterial (undivided)" → "4-lane arterial, undivided".
 */
export function facilityKey(facility: string): string | undefined {
  const f = facility.trim().toLowerCase();
  let m = f.match(/^(\d)-lane expressway/);
  if (m) return `${m[1]}-lane expressway`;
  if (/one[- ]?way/.test(f)) return "one-way per lane";
  if (/^3-lane arterial/.test(f))
    return "3-lane arterial (2 lanes + center turn lane)";
  if (/^5-lane arterial/.test(f)) return "5-lane arterial";
  m = f.match(/^(\d)-lane arterial\s*\((undivided|divided)\)/);
  if (m) return `${m[1]}-lane arterial, ${m[2]}`;
  m = f.match(/^(\d)-lane arterial/);
  if (m) return `${m[1]}-lane arterial`;
  return undefined;
}

/**
 * A segment's capacity under a preset. Per-lane rows (one-way streets) scale by
 * the lane multiple implied by the official capacity (e.g. 33,000 = 3 × 11,000).
 * Returns undefined when the facility isn't in the table.
 */
export function presetCapacity(
  facility: string,
  officialCapacity: number,
  preset: Pick<CapacityPreset, "values">,
) {
  const key = facilityKey(facility);
  const official = key ? officialCapacities[key]?.e : undefined;
  const value = key ? preset.values[key] : undefined;
  if (!official || value === undefined) return undefined;
  return value * (officialCapacity / official);
}

export function isOfficialPreset(preset?: Pick<CapacityPreset, "id">) {
  return !preset || preset.id === officialPresetId;
}
