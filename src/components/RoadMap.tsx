import { CrashPointDots, MapViewport } from "./CrashPointDots";
import {
  type ComponentProps,
  type ComponentType,
  type ReactNode,
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import { topSegmentMarkers, visibleCrashPoints } from "../analysis/crashMap";
import { CrashDensity } from "./CrashDensity";
import { defaultMapLayerOrder } from "../analysis/mapLayers";
import { fromMercator, mercator } from "../analysis/mapProjection";
import {
  GoogleBasemap,
  googleMapsWebKey,
  type BasemapStatus,
} from "./GoogleBasemap";
import {
  type MapMetric,
  rankBadges,
  rankedRows,
  segmentStyle,
  valueRange,
  wardBounds,
} from "../analysis/mapViews";
import { View } from "react-native";
import Svg, {
  Path,
  Polyline,
  Polygon,
  Defs,
  Pattern,
  Rect,
  Circle,
  G,
  Text as SvgText,
} from "react-native-svg";
import { segmentLengthColor, useTheme } from "../theme";
import { useFlow, visibleGeometry } from "../store/useFlow";
import { SegmentResult } from "../analysis/types";
import { T } from "./ui";
// The web renderer supports DOM click handlers; its shared native types omit them.
const WebPolyline = Polyline as ComponentType<
  ComponentProps<typeof Polyline> & { onClick?: () => void }
>;
const WebPolygon = Polygon as ComponentType<
  ComponentProps<typeof Polygon> & { onClick?: () => void }
>;
// Keep pointer updates local: dragging changes the SVG viewport without rebuilding road paths.
function MapSurface({
  children,
  preview,
  zoom,
  focus,
  projection,
  satellite,
  onBasemapStatus,
  onZoomTo,
  resetKey,
}: {
  children: ReactNode;
  preview: boolean;
  zoom: number;
  focus?: Focus;
  projection: { x: number; y: number; scale: number };
  satellite: boolean;
  onBasemapStatus: (status: BasemapStatus) => void;
  onZoomTo?: (zoom: number) => void;
  resetKey: number;
}) {
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const surface = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 360, height: 360 });
  const [lastFocus, setLastFocus] = useState(focus);
  const [lastReset, setLastReset] = useState(resetKey);
  if (resetKey !== lastReset) {
    setLastReset(resetKey);
    setCenter({ x: 0, y: 0 });
  }
  if (focus !== lastFocus) {
    setLastFocus(focus);
    // Place the focused road in the upper part of the map, above the details sheet.
    if (focus)
      setCenter({
        x: focus.x,
        y:
          focus.y +
          (size.height * (focus.shift ?? 0.22) * 360) /
            Math.max(1, Math.min(size.width, size.height)) /
            zoom,
      });
  }
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const dragged = useRef(false);
  const [basemapStatus, setBasemapStatus] =
    useState<BasemapStatus>("unavailable");
  const hasBasemap = Boolean(googleMapsWebKey);
  const showAttribution = hasBasemap && basemapStatus === "ready";
  useEffect(() => {
    onBasemapStatus(hasBasemap ? basemapStatus : "unavailable");
  }, [basemapStatus, hasBasemap, onBasemapStatus]);
  const pixelsPerUnit = Math.min(size.width, size.height) / 360;
  const camera = useMemo(
    () => ({
      center: fromMercator(
        projection.x + center.x / projection.scale,
        projection.y + center.y / projection.scale,
      ),
      zoom: Math.log2((projection.scale * zoom * pixelsPerUnit) / 256),
    }),
    [center, pixelsPerUnit, projection, zoom],
  );
  return (
    <>
      {hasBasemap && (
        <GoogleBasemap
          camera={camera}
          satellite={satellite}
          onStatus={setBasemapStatus}
        />
      )}
      <div
        ref={surface}
        style={{
          position: "absolute",
          inset: 0,
          touchAction: preview ? "auto" : "none",
          clipPath: showAttribution ? "inset(0 0 26px 0)" : undefined,
          cursor: preview ? undefined : "grab",
          pointerEvents: preview ? "none" : "auto",
        }}
        tabIndex={preview ? undefined : 0}
        aria-label={preview ? undefined : "Interactive road map"}
        onKeyDown={(event) => {
          if (preview || event.target !== event.currentTarget) return;
          const step = 32 / zoom;
          switch (event.key) {
            case "ArrowLeft":
              setCenter((c) => ({ ...c, x: c.x - step }));
              break;
            case "ArrowRight":
              setCenter((c) => ({ ...c, x: c.x + step }));
              break;
            case "ArrowUp":
              setCenter((c) => ({ ...c, y: c.y - step }));
              break;
            case "ArrowDown":
              setCenter((c) => ({ ...c, y: c.y + step }));
              break;
            case "+":
            case "=":
              onZoomTo?.(Math.min(zoom * 1.4, 1024));
              break;
            case "-":
              onZoomTo?.(Math.max(zoom / 1.4, 0.5));
              break;
            default:
              return;
          }
          event.preventDefault();
        }}
        onPointerDown={(e) => {
          if (preview || !e.isPrimary || e.button !== 0) return;
          dragged.current = false;
          drag.current = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const dx = e.clientX - d.x,
            dy = e.clientY - d.y;
          if (!d.moved && Math.hypot(dx, dy) < 4) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          d.moved = dragged.current = true;
          d.x = e.clientX;
          d.y = e.clientY;
          const rect = e.currentTarget.getBoundingClientRect();
          const factor =
            360 / (Math.max(1, Math.min(rect.width, rect.height)) * zoom);
          setCenter((c) => ({ x: c.x - dx * factor, y: c.y - dy * factor }));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          if (!drag.current?.moved) drag.current = null;
        }}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.stopPropagation();
            dragged.current = false;
          }
        }}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`${center.x * zoom} ${center.y * zoom} 360 360`}
        >
          <MapViewport.Provider
            value={{
              x: 180 + center.x * zoom,
              y: 180 + center.y * zoom,
              ...size,
              unitsPerPixel: 360 / Math.min(size.width, size.height),
            }}
          >
            {children}
          </MapViewport.Provider>
        </Svg>
      </div>
    </>
  );
}
type Focus = { x: number; y: number; key: number; shift?: number };
// Ranked-road widths by emphasis tier (0 = strongest), in SVG units.
const tierWidths = [5, 4.2, 3.4, 2.6];
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
export function RoadMap({
  preview = false,
  desktop = false,
  onBasemapStatus,
  onSelectSegment,
  segments,
  zoom = 1,
  mode = "Map",
  metric = "combined",
  scopeWard,
  crashYear,
  crashSegmentIds,
  onZoomTo,
  onSelectWard,
  selectedWard,
}: MapProps) {
  const c = useTheme(),
    state = useFlow(),
    data = useMemo(() => visibleGeometry(state.files), [state.files]);
  const roads = useMemo(() => {
    if (segments) return segments;
    const visible = new Set(data.segments.map((s) => s.id));
    return state.results?.segments.filter((s) => visible.has(s.id)) ?? [];
  }, [segments, state.results, data.segments]);
  const crashPoints = useMemo(
    () =>
      visibleCrashPoints(state.files, crashSegmentIds).filter(
        (p) => crashYear === undefined || p.year === crashYear,
      ),
    [state.files, crashSegmentIds, crashYear],
  );
  const markers = useMemo(
    () => topSegmentMarkers(state.files, roads),
    [state.files, roads],
  );
  const heatMode = !preview && mode === "Heat";
  const crashHeat = heatMode && metric === "crashes";
  const crashDots = crashHeat && state.crashPointsVisible;
  const rankView = heatMode && metric !== "crashes" ? metric : undefined;
  // Ranked roads for this view, keyed by segment; recomputed from the loaded
  // results, so a new import recolors the map immediately.
  const ranked = useMemo(() => {
    if (!rankView) return undefined;
    const visible = new Set(roads.map((s) => s.id));
    return rankedRows(state.results, rankView, scopeWard).filter((r) =>
      visible.has(r.id),
    );
  }, [rankView, roads, state.results, scopeWard]);
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
  // Segments picked on the map stay put; selections from elsewhere zoom to fit.
  const tapped = useRef<string | null>(null);
  const select = (id: string) => {
    tapped.current = id;
    if (onSelectSegment) onSelectSegment(id);
    else state.set({ selected: id });
  };
  const bounds = useMemo(() => {
    let minLat = Infinity,
      maxLat = -Infinity,
      minLon = Infinity,
      maxLon = -Infinity;
    const include = ([lat, lon]: number[]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    };
    data.segments.forEach((s) => s.geometry.forEach(include));
    data.wards.forEach((w) => w.rings.forEach((r) => r.forEach(include)));
    if (minLat === Infinity && (crashHeat || crashDots))
      crashPoints.forEach((p) => include(p.point));
    return { minLat, maxLat, minLon, maxLon };
  }, [data, crashPoints, crashHeat, crashDots]);
  const { minLat, maxLat, minLon, maxLon } = bounds;
  const projection = useMemo(() => {
    if (minLat === Infinity) return { x: 0, y: 0, scale: 1 };
    const northwest = mercator([maxLat, minLon]);
    const southeast = mercator([minLat, maxLon]);
    return {
      x: (northwest.x + southeast.x) / 2,
      y: (northwest.y + southeast.y) / 2,
      scale:
        320 /
        Math.max(
          southeast.x - northwest.x,
          southeast.y - northwest.y,
          0.000004,
        ),
    };
  }, [minLat, maxLat, minLon, maxLon]);
  const [basemapStatus, setBasemapStatus] = useState<BasemapStatus>(
    googleMapsWebKey ? "loading" : "unavailable",
  );
  const reportBasemap = useCallback(
    (status: BasemapStatus) => {
      setBasemapStatus(status);
      onBasemapStatus?.(status);
    },
    [onBasemapStatus],
  );
  const selectedSegment = roads.find((s) => s.id === state.selected);
  const [focus, setFocus] = useState<Focus>();
  const lastSelected = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = selectedSegment?.id;
    if (preview || id === lastSelected.current) return;
    lastSelected.current = id;
    if (!selectedSegment || minLat === Infinity) return;
    if (tapped.current === id) {
      tapped.current = null;
      return;
    }
    const points = selectedSegment.geometry.map(mercator);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const extent =
      Math.max(right - left, bottom - top, 0.000002) * projection.scale;
    setFocus({
      x: ((left + right) / 2 - projection.x) * projection.scale,
      y: ((top + bottom) / 2 - projection.y) * projection.scale,
      key: Date.now(),
      shift: desktop ? 0 : undefined,
    });
    onZoomTo?.(Math.min(Math.max(200 / extent, 1), 1024));
  }, [preview, selectedSegment, minLat, projection, desktop, onZoomTo]);
  // Zoom to the scoped ward (or back to the whole city) in Heat mode.
  const wardScope = rankView ? scopeWard : undefined;
  const lastScope = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (preview || wardScope === lastScope.current || minLat === Infinity)
      return;
    // Zoom on the next frame, after the Heat card has rendered the new scope.
    const frame = requestAnimationFrame(() => {
      lastScope.current = wardScope;
      const box = wardScope ? wardBounds(data.wards, wardScope) : undefined;
      if (!box) {
        setFocus({ x: 0, y: 0, key: Date.now(), shift: 0 });
        onZoomTo?.(1);
        return;
      }
      const [[south, west], [north, east]] = box;
      const a = mercator([north, west]);
      const b = mercator([south, east]);
      const extent = Math.max(b.x - a.x, b.y - a.y) * projection.scale;
      setFocus({
        x: ((a.x + b.x) / 2 - projection.x) * projection.scale,
        y: ((a.y + b.y) / 2 - projection.y) * projection.scale,
        key: Date.now(),
        shift: desktop ? 0 : 0.2,
      });
      onZoomTo?.(Math.min(Math.max((desktop ? 245 : 150) / extent, 1), 64));
    });
    return () => cancelAnimationFrame(frame);
  }, [preview, wardScope, data.wards, minLat, projection, desktop, onZoomTo]);
  if (minLat === Infinity)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.mapBackground,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 180,
        }}
      >
        <Svg width="100%" height="100%" style={{ position: "absolute" }}>
          <Defs>
            <Pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <Path
                d="M 40 0 L 0 0 0 40"
                stroke={c.divider}
                strokeWidth="1"
                fill="none"
              />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#grid)" />
        </Svg>
        <View
          style={{ padding: 20, maxWidth: 300, alignItems: "center", gap: 6 }}
        >
          <T heading size={preview ? 18 : 22}>
            Your map will appear here
          </T>
          <T muted size={12} style={{ textAlign: "center" }}>
            Import road segments and ward boundaries to explore Norman.
          </T>
        </View>
      </View>
    );
  const scale = projection.scale * zoom;
  const project = (point: number[]) => {
    const { x, y } = mercator(point);
    return `${180 + (x - projection.x) * scale},${180 + (y - projection.y) * scale}`;
  };
  const unproject = (x: number, y: number) =>
    fromMercator(
      projection.x + (x - 180) / scale,
      projection.y + (y - 180) / scale,
    );
  const layers = {
    wards: (
      <G testID="map-layer-wards">
        {data.wards.map((w, i) =>
          w.rings.map((ring, j) => (
            <WebPolygon
              key={`${i}-${j}`}
              points={ring.map(project).join(" ")}
              onClick={() => !preview && onSelectWard?.(w.id)}
              fill={c.wardFills[(w.id - 1) % c.wardFills.length]}
              // In a ward view, the other wards fade so the focus ward stands out.
              fillOpacity={
                wardScope && w.id !== wardScope
                  ? c.wardFillOpacity * 0.3
                  : c.wardFillOpacity
              }
              stroke={
                wardScope && w.id !== wardScope
                  ? c.divider
                  : c.wardStrokes[(w.id - 1) % c.wardStrokes.length]
              }
              strokeWidth={c.wardStrokeWidth}
            />
          )),
        )}
        {/* Outline a tapped ward on top of its neighbours' shared edges. */}
        {!preview &&
          data.wards
            .filter((w) => w.id === selectedWard)
            .flatMap((w, i) =>
              w.rings.map((ring, j) => (
                <Polygon
                  key={`selected-ward-${i}-${j}`}
                  points={ring.map(project).join(" ")}
                  fill="none"
                  stroke={c.ink}
                  strokeWidth={2.5}
                  pointerEvents="none"
                />
              )),
            )}
      </G>
    ),
    segments: (
      <G testID="map-layer-segments">
        {/* In a ranking view, unranked roads draw first (thin gray) and the
            strongest tiers last, so the best-ranked roads sit on top. */}
        {[...roads]
          .sort(
            (a, b) =>
              (styles ? (styles.get(b.id)?.tier ?? 9) : 0) -
              (styles ? (styles.get(a.id)?.tier ?? 9) : 0),
          )
          .map((s) => {
            const style = styles?.get(s.id);
            const color = styles
              ? (style?.color ?? c.unrankedRoad)
              : segmentLengthColor(s.lengthMi, c);
            const width = styles
              ? style
                ? tierWidths[style.tier]
                : 1.2
              : preview
                ? 1
                : 2.5;
            return (
              <G key={s.id}>
                {style?.overCapacity && (
                  <WebPolyline
                    points={s.geometry.map(project).join(" ")}
                    fill="none"
                    stroke={c.ink}
                    strokeWidth={width + 3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />
                )}
                <WebPolyline
                  points={s.geometry.map(project).join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onClick={() => !preview && select(s.id)}
                />
              </G>
            );
          })}
        {/* Draw the selected road above other roads in the segment layer. */}
        {selectedSegment &&
          !preview &&
          [
            { color: c.ink, width: 9 },
            { color: c.primary, width: 5 },
          ].map((line) => (
            <WebPolyline
              key={`selected-${line.width}`}
              points={selectedSegment.geometry.map(project).join(" ")}
              fill="none"
              stroke={line.color}
              strokeWidth={line.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          ))}
      </G>
    ),
    hotspots: crashHeat ? (
      <G testID="map-layer-hotspots" pointerEvents="none">
        <CrashDensity points={crashPoints} project={project} />
        {crashDots && (
          <CrashPointDots
            points={crashPoints}
            project={project}
            unproject={unproject}
          />
        )}
      </G>
    ) : null,
  };
  const layerOrder =
    desktop && !preview ? state.mapLayerOrder : defaultMapLayerOrder;
  return (
    <View style={{ flex: 1, backgroundColor: c.mapBackground }}>
      <MapSurface
        resetKey={state.mapReset}
        zoom={zoom}
        preview={preview}
        focus={focus}
        projection={projection}
        satellite={mode === "Satellite"}
        onBasemapStatus={reportBasemap}
        onZoomTo={onZoomTo}
      >
        {[...layerOrder].reverse().map((layer) => (
          <G key={layer}>{layers[layer]}</G>
        ))}
        {[
          ...(crashHeat
            ? markers.map((m) => ({ ...m, fill: c.crashMarker, kind: "crash" }))
            : []),
          ...badges.map((b) => ({ ...b, fill: c.ink, kind: "ward" })),
        ].map((marker) => {
          const [cx, cy] = project(marker.point).split(",").map(Number);
          return (
            <G
              key={`${marker.kind}-${marker.id}`}
              onClick={() => select(marker.id)}
              accessibilityLabel={
                marker.kind === "crash"
                  ? `Citywide crash rank ${marker.rank}`
                  : `Ward ${scopeWard} rank ${marker.rank}`
              }
            >
              <Circle cx={cx} cy={cy} r={22} fill="transparent" />
              <Circle
                cx={cx}
                cy={cy}
                r={10}
                fill={marker.fill}
                stroke={c.white}
                strokeWidth={2}
              />
              <SvgText
                x={cx}
                y={cy}
                dy={3.5}
                textAnchor="middle"
                fill={c.white}
                fontSize={10}
                fontWeight="bold"
              >
                {marker.rank}
              </SvgText>
            </G>
          );
        })}
      </MapSurface>
      {mode === "Satellite" && basemapStatus !== "ready" && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: desktop ? 16 : "48%",
            alignSelf: "center",
            maxWidth: "85%",
            backgroundColor: c.surface,
            padding: 10,
            borderRadius: 12,
          }}
        >
          <T muted size={12}>
            {basemapStatus === "loading"
              ? "Loading satellite imagery…"
              : "Satellite imagery is unavailable. Showing Norman’s road and ward layers."}
          </T>
        </View>
      )}
    </View>
  );
}
