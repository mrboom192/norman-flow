import type { Href } from "expo-router";
import type { MapLayer } from "../analysis/mapLayers";
import type { TourTargetId } from "../components/tourTargets";

export type TourMode = "short" | "detailed";
export type ActiveTour = { mode: TourMode; step: number };

type TourStep = {
  route: Extract<Href, string>;
  target: TourTargetId;
  title: string;
  body: string;
  /** Layers to show or hide on the map during this step (not saved). */
  mapView?: { layers: Partial<Record<MapLayer, boolean>> };
};

export const tourSteps: Record<TourMode, readonly TourStep[]> = {
  short: [
    {
      route: "/",
      target: "home-map",
      title: "Start on Home",
      body: "Open the map from the preview. The tiles beside or below it show what data is loaded and link to sources and key numbers.",
    },
    {
      route: "/ranks",
      target: "ranks-wards",
      title: "Find the rankings you need",
      body: "Choose a ward or Citywide, then switch between Combined, V/C ratio and Collisions. Open a road row for its details, or use the download icon to export to Excel.",
    },
    {
      route: "/search",
      target: "map-search",
      title: "Explore Norman’s roads",
      body: "Search for a road or ward and select a segment on the map. The button at the top right switches between Map and Satellite. Data layers adds rankings, crash hotspots and ward focus.",
    },
    {
      route: "/chat",
      target: "chat-input",
      title: "Ask about the analysis",
      body: "Try a suggested question or ask which segment ranks first in a ward. Basic answers stay available when AI is offline.",
    },
    {
      route: "/menu",
      target: "menu-data",
      title: "Update the results",
      body: "Run the Norman Flow Excel tool or Colab notebook, then use Add new data & re-rank to import its results. Find files, settings and Replay tutorial here in Menu.",
    },
  ],
  detailed: [
    {
      route: "/",
      target: "home-map",
      title: "Open the full map",
      body: "The Home preview shows the study roads and ward boundaries. Use the expand button to open the interactive map, or the layers button to jump to its source files.",
    },
    {
      route: "/",
      target: "home-data",
      title: "Check the active dataset",
      body: "Home shows which analysis is loaded and when it was last updated. Open a tile for road segments, wards, lane counts, traffic counts, collisions or road capacity.",
    },
    {
      route: "/data/segments",
      target: "data-source",
      title: "Read the sources and methods",
      body: "Each data page explains where its inputs came from, how the analysis used them and what the loaded files contain. The Files section links to available source files.",
    },
    {
      route: "/ranks",
      target: "ranks-wards",
      title: "Choose a ward or Citywide",
      body: "Select any of the eight wards or view all of Norman. A segment that touches more than one ward can appear in each applicable ward’s results.",
    },
    {
      route: "/ranks",
      target: "ranks-metrics",
      title: "Compare the three ranking lists",
      body: "V/C divides a segment’s highest daily volume by its capacity. Collisions counts crashes on the segment. Combined adds the V/C and collision ranks, so lower scores come first. Ties share a rank.",
    },
    {
      route: "/ranks",
      target: "ranks-sort",
      title: "Search and sort the list",
      body: "Use Search roads to narrow the list. Choose a field and a sort direction to compare results. Changing the display order keeps each segment’s rank number.",
    },
    {
      route: "/ranks",
      target: "ranks-first",
      title: "Inspect a ranked segment",
      body: "Expand a road row for V/C, collision count, highest traffic volume, LOS E capacity and lane count. Show on map takes you to that segment.",
    },
    {
      route: "/ranks",
      target: "ranks-export",
      title: "Export to Excel",
      body: "The download button exports the selected ward or all eight wards. Choose Citywide to export the citywide list. Workbooks also include segment data and run details.",
    },
    {
      route: "/search",
      target: "map-search",
      title: "Find a road or ward",
      body: "Search by street name or ward. The filter button narrows the map to the focused ward, roads with four or more lanes, roads with crashes or roads with traffic counts.",
    },
    {
      route: "/search",
      target: "map-modes",
      title: "Change the basemap",
      body: "The button at the top right opens Basemap settings. Choose Map for streets or Satellite for aerial imagery, with or without labels. Select a road for its metrics, or a ward to open its rankings.",
    },
    {
      route: "/search",
      target: "map-summary",
      title: "See where ranked roads are",
      body: "In Data layers, turn on Combined ranking, V/C ratio or Collisions to color the ranked roads. Focus a ward under Ward boundaries to see that ward’s ranks. The legend explains the colors.",
      mapView: { layers: { combined: true } },
    },
    {
      route: "/search",
      target: "map-summary",
      title: "Explore crash hotspots",
      body: "Turn on Crash hotspots in Data layers to see crash density. Its options choose a year or show individual crash locations. Numbered markers identify the citywide segments with the most crashes.",
      mapView: { layers: { hotspots: true } },
    },
    {
      route: "/search",
      target: "map-tools",
      title: "Use layers, zoom and reset",
      body: "Data layers turns layers on or off and drags them into the order they draw. The filter button narrows the roads. Use plus and minus to zoom and the reset arrow to clear the map view.",
    },
    {
      route: "/chat",
      target: "chat-input",
      title: "Ask the chatbot",
      body: "Choose a suggested question or ask about a named segment, ward or ranking method. AI answers use the loaded analysis, and basic answers work offline.",
    },
    {
      route: "/menu",
      target: "menu-data",
      title: "Manage the analysis",
      body: "See included and uploaded files, change advanced analysis settings, or restore the bundled results. Undo last analysis run is available when there’s a previous run to restore.",
    },
    {
      route: "/import",
      target: "import-files",
      title: "Import and review new results",
      body: "Choose a rankings CSV from the Norman Flow Excel tool or Colab notebook. Add updated map layers if needed, review the changes, then confirm. Use Advanced only for unofficial raw-data runs.",
    },
    {
      route: "/diagnostics",
      target: "diagnostics-review",
      title: "Review an analysis run",
      body: "Analysis review reports matched records, unmatched records and lane checks for raw-data runs. The official results CSV already supplies segment totals.",
    },
    {
      route: "/menu",
      target: "menu-appearance",
      title: "Adjust the app and find help",
      body: "Change dark mode, map colors or the app accent. Resources has the capacity table, what-if presets and City maps. Help has reusable tool videos and Replay tutorial.",
    },
  ],
};

export function getTourStep(tour: ActiveTour | null) {
  return tour ? tourSteps[tour.mode][tour.step] : undefined;
}
