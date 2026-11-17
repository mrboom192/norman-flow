// Text for the "Data in this analysis" detail pages (Home → tap a tile).
// Edit the wording here; layout lives in src/app/data/[topic].tsx.
// Key numbers are computed live from the loaded data (src/analysis/dataStats.ts),
// so they stay correct after an import; only their labels are set here.
import type { StatId } from "../analysis/dataStats";

export type DataPage = {
  id: string;
  title: string;
  /** The live number and label on this page's Home tile. */
  tile: { stat: StatId; label: string };
  whatItIs: string;
  whereFrom: string;
  howUsed: string[];
  keyNumbers: { label: string; stat: StatId }[];
  /** Bundled files by name; "acog-pdf" is the ACOG capacity PDF. */
  files: string[];
};

export const dataPages: DataPage[] = [
  {
    id: "segments",
    title: "Road segments",
    tile: { stat: "segments", label: "Road segments" },
    whatItIs:
      "375 road segments covering 54 arterial roads (366 miles) in Norman.",
    whereFrom:
      "The City of Norman street centerline map (maps.normanok.gov), which includes lane counts and one-way roads.",
    howUsed: [
      "The City asked for segments of about one mile, so each segment can have its own traffic count, crash count and ward. We cut each road only at real intersections with major roads, and where the number of lanes changes (2 to 4 lanes), as the City asked. We picked the cuts that came closest to one mile. Norman’s major streets are about a mile apart, but not exactly, so most segments are 0.97–1.03 miles.",
      "Why 0.75–1.25 miles is “about a mile”: we treat anything within a quarter mile of one mile as standard (blue). Shorter segments (red) usually happen where a road ends or two major roads are close together. Longer ones (purple) are rural stretches with no major cross street. The colors are labels only; they don’t affect rankings.",
    ],
    keyNumbers: [
      { label: "Segments", stat: "segments" },
      { label: "Arterial roads", stat: "roads" },
      { label: "Total miles", stat: "miles" },
      { label: "Median length", stat: "medianLength" },
      { label: "Standard (0.75–1.25 mi)", stat: "standardSegments" },
      { label: "Short (under 0.75 mi)", stat: "shortSegments" },
      { label: "Long (over 1.25 mi)", stat: "longSegments" },
      { label: "Ranked", stat: "rankedSegments" },
    ],
    files: ["norman_segments.geojson", "Final_Segments.kmz"],
  },
  {
    id: "wards",
    title: "City Council wards",
    tile: { stat: "wards", label: "City Council wards" },
    whatItIs: "The 8 City Council ward boundaries.",
    whereFrom: "The City of Norman’s council ward map.",
    howUsed: [
      "A segment counts in a ward if at least 0.1 mile of it lies in or along that ward, so segments on a ward line appear in both wards, as the City asked. Each ward is ranked on its own.",
    ],
    keyNumbers: [
      { label: "Wards", stat: "wards" },
      { label: "Segments in more than one ward", stat: "boundarySegments" },
    ],
    files: ["norman_wards.geojson"],
  },
  {
    id: "lanes",
    title: "Lane counts",
    tile: {
      stat: "aerialCheckSegments",
      label: "Segments using team lane checks",
    },
    whatItIs:
      "The number of through lanes on each segment, which sets its road type and capacity.",
    whereFrom: "The City of Norman street centerline data.",
    howUsed: [
      "The team checked 38 locations on aerial images and Street View, and those checks replace the City value where they differ.",
    ],
    keyNumbers: [
      { label: "Lanes from a team aerial check", stat: "aerialChecks" },
    ],
    files: ["norman_flow_rankings.csv"],
  },
  {
    id: "traffic",
    title: "Traffic counts",
    tile: { stat: "segmentsWithCount", label: "Segments with traffic counts" },
    whatItIs:
      "Daily traffic volumes (vehicles per day, both directions) at City count stations.",
    whereFrom: "City/ACOG traffic counts for FY19, FY21, FY23, FY25 and FY26.",
    howUsed: [
      "Each segment uses its highest count across those years. Collector-road counts are left out, as the City asked.",
    ],
    keyNumbers: [
      { label: "Segments with a usable count", stat: "segmentsWithCount" },
      { label: "No usable count", stat: "noCount" },
      { label: "Collector roads left out", stat: "collectorRoads" },
    ],
    files: ["norman_flow_rankings.csv"],
  },
  {
    id: "collisions",
    title: "Collisions",
    tile: {
      stat: "collisionsOnRanked",
      label: "Collisions on ranked segments",
    },
    whatItIs: "Reported crashes on Norman’s roads, 2016–2026.",
    whereFrom: "City of Norman police crash records.",
    howUsed: [
      "Private-property crashes and duplicates are removed. Each crash is placed at its reported intersection, moved by the reported distance and direction. Intersection crashes count for every segment that meets there.",
    ],
    keyNumbers: [
      { label: "Placed crashes", stat: "crashPoints" },
      { label: "On study segments", stat: "crashPointsOnSegments" },
      { label: "Years", stat: "crashYears" },
      { label: "Collisions on ranked segments", stat: "collisionsOnRanked" },
    ],
    files: ["norman_crash_points.geojson"],
  },
  {
    id: "capacity",
    title: "Road capacity (ACOG LOS E)",
    tile: { stat: "facilities", label: "Road types (LOS E)" },
    whatItIs: "How many vehicles per day each type of road can carry (LOS E).",
    whereFrom:
      "The ACOG 2025 plan’s network capacity table, plus the City of Norman’s 3-lane value of 18,900 (17,100 + 1,800).",
    howUsed: [
      "V/C = highest traffic count ÷ capacity. 1.0 or more means the road carries more traffic than its capacity.",
    ],
    keyNumbers: [
      { label: "Road types in the table", stat: "facilities" },
      { label: "Ranked segments over capacity", stat: "overCapacity" },
    ],
    files: ["acog-pdf"],
  },
];
