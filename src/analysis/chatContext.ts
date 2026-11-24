// The DATA the AI chatbot answers from: the loaded results, capacities, crash
// points and the "Data in this analysis" page text. Pure TypeScript.
import { officialCapacities } from "./capacity";
import { computeStats } from "./dataStats";
import type { Inputs, Results } from "./types";
import { dataPages } from "../config/dataPages";

export function buildChatContext({
  inputs,
  results,
  dataset,
}: {
  inputs: Inputs;
  results: Results | null;
  /** e.g. "Dataset: base data (official 2026 results)." plus any what-if note. */
  dataset: string;
}) {
  const lines: string[] = [dataset];
  const preset = results?.settings.capacityPreset;
  lines.push(
    `Capacity table in use: ${preset ? `what-if preset "${preset.name}"` : "ACOG 2025 LOS E (official)"}.`,
  );
  if (results) {
    const ranked = results.segments.filter(
      (s) => s.rankable && s.maxVolume !== undefined,
    );
    lines.push(
      "",
      "RANKED SEGMENTS (key | road | from → to | wards | miles | highest volume vpd | facility | lane source | LOS E capacity | V/C (2 decimals as shown in app) | collisions)",
      ...ranked.map((s) =>
        [
          s.id,
          s.road,
          `${s.from ?? ""} → ${s.to ?? ""}`,
          s.wards.map((w) => `Ward ${w}`).join(", "),
          s.lengthMi,
          s.maxVolume,
          s.facility ?? "",
          s.laneSource ?? "",
          s.capacity,
          s.vc?.toFixed(2),
          s.collisions ?? "unknown",
        ].join(" | "),
      ),
      "",
      "WARD RANKINGS (combined rank: key, V/C rank + collision rank = score). Ties share a rank.",
    );
    for (let w = 1; w <= 8; w++) {
      const list = results.wards[w]?.combined ?? [];
      lines.push(
        `Ward ${w} (${list.length} ranked): ` +
          list
            .map(
              (s) =>
                `#${s.combinedRank} ${s.id} (${s.vcRank}+${s.collisionRank}=${s.combinedScore})`,
            )
            .join("; "),
      );
    }
    const unranked = results.segments.filter((s) => !s.publishedRanked);
    lines.push(
      "",
      `UNRANKED SEGMENTS: ${unranked.length} (shown gray on the map). Reasons: ` +
        Object.entries(
          unranked.reduce<Record<string, number>>((n, s) => {
            const k = s.preparedStatus ?? "Not ranked";
            n[k] = (n[k] ?? 0) + 1;
            return n;
          }, {}),
        )
          .map(([k, n]) => `${k}: ${n}`)
          .join("; "),
    );
  }
  lines.push(
    "",
    "LOS E CAPACITIES (vehicles/day)",
    ...Object.entries(officialCapacities).map(
      ([k, v]) =>
        `${k}: ${(preset?.values[k] ?? v.e).toLocaleString("en-US")}${v.note ? ` (${v.note})` : ""}`,
    ),
  );
  const stats = computeStats(inputs, results);
  lines.push("", "DATA IN THIS ANALYSIS PAGES");
  for (const page of dataPages)
    lines.push(
      `## ${page.title}`,
      `What it is: ${page.whatItIs}`,
      `Where it came from: ${page.whereFrom}`,
      `How we used it: ${page.howUsed.join(" ")}`,
      `Key numbers: ${page.keyNumbers
        .map((k) => `${k.label} ${stats[k.stat] ?? "N/A"}`)
        .join("; ")}`,
    );
  return lines.join("\n");
}
