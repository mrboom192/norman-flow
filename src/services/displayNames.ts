const baseNames: Record<string, string> = {
  "norman_wards.geojson": "Ward map",
  "norman_segments.geojson": "Segments",
  "norman_flow_rankings.csv": "Priority rankings",
  "norman_crash_points.geojson": "Crash locations",
};

// Presentation only: preserve filenames used for parsing, caching and replacement.
export function fileDisplayName(file: { name: string; source?: string }) {
  return file.source === "base"
    ? (baseNames[file.name] ?? file.name)
    : file.name;
}
