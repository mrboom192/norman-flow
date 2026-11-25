import { useShallow } from "zustand/react/shallow";
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
import { CrashDensity } from "./CrashDensity";
import { defaultLayerStyle, type MapLayer } from "../analysis/mapLayers";
import type { RankKind } from "../analysis/types";
import { fromMercator, mercator } from "../analysis/mapProjection";
import {
  GoogleBasemap,
  googleMapsWebKey,
  type BasemapStatus,
} from "./GoogleBasemap";
import { wardBounds } from "../analysis/mapViews";
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
import { useFlow } from "../store/useFlow";
import {
  type BasemapView,
  useRoadMapData,
  type MapProps,
} from "./useRoadMapData";
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
  basemap,
  onBasemapStatus,
  onZoomTo,
  resetKey,
}: {
  children: ReactNode;
  preview: boolean;
  zoom: number;
  focus?: Focus;
  projection: { x: number; y: number; scale: number };
  basemap: BasemapView;
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
          type={basemap}
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
export type { MapProps } from "./useRoadMapData";
export function RoadMap({
  preview = false,
  desktop = false,
  onBasemapStatus,
  onSelectSegment,
  segments,
  zoom = 1,
  basemap = "roadmap",
  layers: visibleLayers,
  scopeWard,
  crashYear,
  crashSegmentIds,
  onZoomTo,
  onSelectWard,
  selectedWard,
}: MapProps) {
  const state = useFlow(
    useShallow((s) => ({
      crashPointsVisible: s.crashPointsVisible,
      mapReset: s.mapReset,
      mapLayerStyles: s.mapLayerStyles,
      selected: s.selected,
      set: s.set,
    })),
  );
  const {
    c,
    data,
    roads,
    crashPoints,
    markers,
    crashHeat,
    shown,
    rankStyles,
    badgeKind,
    badges,
  } = useRoadMapData({
    segments,
    preview,
    layers: visibleLayers,
    scopeWard,
    crashYear,
    crashSegmentIds,
  });
  const crashDots = crashHeat && state.crashPointsVisible;
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
  // Zoom to the focused ward (or back to the whole city).
  const wardScope = preview ? undefined : scopeWard;
  const lastScope = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (preview || wardScope === lastScope.current || minLat === Infinity)
      return;
    // Zoom on the next frame, after the panel has rendered the new focus.
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
  // The Home preview keeps the default look; the map uses the saved styles.
  const layerStyle = (layer: MapLayer) =>
    preview ? defaultLayerStyle : state.mapLayerStyles[layer];
  const rankLayer = (kind: RankKind) => (
    <RankLayer
      kind={kind}
      roads={roads}
      styles={rankStyles[kind]}
      project={project}
      widthScale={layerStyle(kind).width}
      onSelect={select}
    />
  );
  const layers: Record<MapLayer, ReactNode> = {
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
              strokeWidth={c.wardStrokeWidth * layerStyle("wards").width}
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
        {roads.map((s) => (
          <WebPolyline
            key={s.id}
            points={s.geometry.map(project).join(" ")}
            fill="none"
            stroke={segmentLengthColor(s.lengthMi, c)}
            strokeWidth={preview ? 1 : 2.5 * layerStyle("segments").width}
            strokeLinecap="round"
            strokeLinejoin="round"
            onClick={() => !preview && select(s.id)}
          />
        ))}
      </G>
    ),
    combined: rankLayer("combined"),
    vc: rankLayer("vc"),
    collisions: rankLayer("collisions"),
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
  return (
    <View style={{ flex: 1, backgroundColor: c.mapBackground }}>
      <MapSurface
        resetKey={state.mapReset}
        zoom={zoom}
        preview={preview}
        focus={focus}
        projection={projection}
        basemap={basemap}
        onBasemapStatus={reportBasemap}
        onZoomTo={onZoomTo}
      >
        {[...shown].reverse().map((layer) => (
          <G key={layer} opacity={layerStyle(layer).opacity}>
            {layers[layer]}
          </G>
        ))}
        {/* The selected road draws above every layer. */}
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
                  : `Ward ${scopeWard} ${rankKindLabel[badgeKind ?? "combined"]} rank ${marker.rank}`
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
      {!preview && basemap !== "roadmap" && basemapStatus !== "ready" && (
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

const rankKindLabel: Record<RankKind, string> = {
  combined: "combined",
  vc: "V/C",
  collisions: "collision",
};

/** One ranking layer: only its ranked roads, best tiers drawn last. */
function RankLayer({
  kind,
  roads,
  styles,
  project,
  widthScale,
  onSelect,
}: {
  kind: RankKind;
  roads: { id: string; geometry: number[][] }[];
  styles?: Map<string, { color: string; tier: number; overCapacity: boolean }>;
  project: (point: number[]) => string;
  widthScale: number;
  onSelect: (id: string) => void;
}) {
  const c = useTheme();
  if (!styles) return null;
  return (
    <G testID={`map-layer-${kind}`}>
      {roads
        .filter((s) => styles.has(s.id))
        .sort((a, b) => styles.get(b.id)!.tier - styles.get(a.id)!.tier)
        .map((s) => {
          const style = styles.get(s.id)!;
          const width = tierWidths[style.tier] * widthScale;
          const points = s.geometry.map(project).join(" ");
          return (
            <G key={s.id}>
              {style.overCapacity && (
                <WebPolyline
                  points={points}
                  fill="none"
                  stroke={c.ink}
                  strokeWidth={width + 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              )}
              <WebPolyline
                points={points}
                fill="none"
                stroke={style.color}
                strokeWidth={width}
                strokeLinecap="round"
                strokeLinejoin="round"
                onClick={() => onSelect(s.id)}
              />
            </G>
          );
        })}
    </G>
  );
}
