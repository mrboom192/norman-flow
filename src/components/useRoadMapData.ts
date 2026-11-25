import { useMemo } from "react";
import { topSegmentMarkers, visibleCrashPoints } from "../analysis/crashMap";
import { isRankLayer, type MapLayer } from "../analysis/mapLayers";
import {
  rankBadges,
  rankedRows,
  segmentStyle,
  type SegmentStyle,
  valueRange,
} from "../analysis/mapViews";
import type { RankKind, SegmentResult } from "../analysis/types";
import { useFlow, visibleGeometry } from "../store/useFlow";
import { useTheme } from "../theme";
import type { BasemapStatus } from "./GoogleBasemap";

/** Google basemap type: plain map, imagery, or imagery with labels. */
export type BasemapView = "roadmap" | "satellite" | "hybrid";

export type MapProps = {
  preview?: boolean;
  desktop?: boolean;
  onBasemapStatus?: (status: BasemapStatus) => void;
  onSelectSegment?: (id: string) => void;
  segments?: SegmentResult[];
  zoom?: number;
  basemap?: BasemapView;
  /** Visible data layers, front to back. Defaults to roads over wards. */
  layers?: readonly MapLayer[];
  /** Ward focus from the ward layer: ranks within it and fades the others. */
  scopeWard?: number;
  /** Show only crashes from this year on the hotspot layer. */
  crashYear?: number;
  crashSegmentIds?: Set<string>;
  /** Called when the map zooms itself to fit a selected segment. */
  onZoomTo?: (zoom: number) => void;
  /** Tapping inside a ward (not on a road) reports which ward it is. */
  onSelectWard?: (ward: number) => void;
  /** Ward to outline after a tap. */
  selectedWard?: number;
};

export const previewLayers: readonly MapLayer[] = ["segments", "wards"];

export function useRoadMapData({
  segments,
  preview,
  layers = previewLayers,
  scopeWard,
  crashYear,
  crashSegmentIds,
}: MapProps) {
  const c = useTheme();
  const files = useFlow((s) => s.files);
  const results = useFlow((s) => s.results);
  const data = useMemo(() => visibleGeometry(files), [files]);
  const shown = preview ? previewLayers : layers;
  const roads = useMemo(() => {
    if (segments) return segments;
    const visible = new Set(data.segments.map((s) => s.id));
    return results?.segments.filter((s) => visible.has(s.id)) ?? [];
  }, [segments, results, data.segments]);
  const crashHeat = shown.includes("hotspots");
  const crashPoints = useMemo(
    () =>
      visibleCrashPoints(files, crashSegmentIds).filter(
        (p) => crashYear === undefined || p.year === crashYear,
      ),
    [files, crashSegmentIds, crashYear],
  );
  const markers = useMemo(
    () => (crashHeat ? topSegmentMarkers(files, roads) : []),
    [crashHeat, files, roads],
  );
  const rankKey = shown.filter(isRankLayer).join(",");
  // Ranked roads for each visible ranking layer, keyed by segment; recomputed
  // from the loaded results, so a new import recolors the map immediately.
  const ranked = useMemo(() => {
    const visible = new Set(roads.map((s) => s.id));
    const kinds = (rankKey ? rankKey.split(",") : []) as RankKind[];
    return kinds.map((kind) => {
      const rows = rankedRows(results, kind, scopeWard).filter((r) =>
        visible.has(r.id),
      );
      const range = valueRange(rows);
      return {
        kind,
        rows,
        styles: new Map<string, SegmentStyle>(
          rows.map((r) => [r.id, segmentStyle(r, kind, range, c)]),
        ),
      };
    });
  }, [rankKey, roads, results, scopeWard, c]);
  const rankStyles = useMemo(
    () =>
      Object.fromEntries(ranked.map((r) => [r.kind, r.styles])) as Partial<
        Record<RankKind, Map<string, SegmentStyle>>
      >,
    [ranked],
  );
  // Numbered badges follow the frontmost ranking layer in a ward focus.
  const front = ranked[0];
  const badges = useMemo(
    () => (front && scopeWard !== undefined ? rankBadges(front.rows) : []),
    [front, scopeWard],
  );
  return {
    c,
    data,
    roads,
    shown,
    crashPoints,
    markers,
    crashHeat,
    rankStyles,
    badgeKind: front?.kind,
    badges,
  };
}
