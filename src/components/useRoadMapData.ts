import { useMemo } from "react";
import { topSegmentMarkers, visibleCrashPoints } from "../analysis/crashMap";
import {
  type MapMetric,
  rankBadges,
  rankedRows,
  segmentStyle,
  valueRange,
} from "../analysis/mapViews";
import type { SegmentResult } from "../analysis/types";
import { useFlow, visibleGeometry } from "../store/useFlow";
import { useTheme } from "../theme";
import type { BasemapStatus } from "./GoogleBasemap";

export type MapProps = {
  preview?: boolean;
  desktop?: boolean;
  onBasemapStatus?: (status: BasemapStatus) => void;
  onSelectSegment?: (id: string) => void;
  segments?: SegmentResult[];
  zoom?: number;
  mode?: string;
  /** Heat-mode view: a ranking metric or the crash hotspot layer. */
  metric?: MapMetric;
  /** Ward to focus in Heat mode; undefined is citywide. */
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
export function useRoadMapData({
  segments,
  preview,
  mode,
  metric = "combined",
  scopeWard,
  crashYear,
  crashSegmentIds,
}: MapProps) {
  const c = useTheme();
  const files = useFlow((s) => s.files);
  const results = useFlow((s) => s.results);
  const data = useMemo(() => visibleGeometry(files), [files]);
  const roads = useMemo(() => {
    if (segments) return segments;
    const visible = new Set(data.segments.map((s) => s.id));
    return results?.segments.filter((s) => visible.has(s.id)) ?? [];
  }, [segments, results, data.segments]);
  const crashPoints = useMemo(
    () =>
      visibleCrashPoints(files, crashSegmentIds).filter(
        (p) => crashYear === undefined || p.year === crashYear,
      ),
    [files, crashSegmentIds, crashYear],
  );
  const markers = useMemo(
    () => topSegmentMarkers(files, roads),
    [files, roads],
  );
  const heatMode = !preview && mode === "Heat";
  const crashHeat = heatMode && metric === "crashes";
  const rankView = heatMode && metric !== "crashes" ? metric : undefined;
  // Ranked roads for this view, keyed by segment; recomputed from the loaded
  // results, so a new import recolors the map immediately.
  const ranked = useMemo(() => {
    if (!rankView) return undefined;
    const visible = new Set(roads.map((s) => s.id));
    return rankedRows(results, rankView, scopeWard).filter((r) =>
      visible.has(r.id),
    );
  }, [rankView, roads, results, scopeWard]);
  const styles = useMemo(() => {
    if (!ranked || !rankView) return undefined;
    const range = valueRange(ranked);
    return new Map(
      ranked.map((r) => [r.id, segmentStyle(r, rankView, range, c)]),
    );
  }, [ranked, rankView, c]);
  const badges = useMemo(
    () => (ranked && scopeWard !== undefined ? rankBadges(ranked) : []),
    [ranked, scopeWard],
  );
  return {
    c,
    data,
    roads,
    crashPoints,
    markers,
    crashHeat,
    rankView,
    styles,
    badges,
  };
}
