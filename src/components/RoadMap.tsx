import { CrashPointDots, MapViewport } from "./CrashPointDots";
import {
  type ComponentProps,
  type ComponentType,
  type ReactNode,
  useRef,
  useEffect,
  useState,
  useMemo,
} from "react";
import { topSegmentMarkers, visibleCrashPoints } from "../analysis/crashMap";
import { CrashDensity } from "./CrashDensity";
import { heatColor, heatRange, heatValue } from "../analysis/heatmap";
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
// Keep pointer updates local: dragging changes the SVG viewport without rebuilding road paths.
function MapSurface({
  children,
  preview,
  zoom,
  focus,
}: {
  children: ReactNode;
  preview: boolean;
  zoom: number;
  focus?: { x: number; y: number; key: number };
}) {
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const surface = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 360, height: 360 });
  const [lastFocus, setLastFocus] = useState(focus);
  if (focus !== lastFocus) {
    setLastFocus(focus);
    // Place the focused road in the upper part of the map, above the details sheet.
    if (focus)
      setCenter({
        x: focus.x,
        y:
          focus.y +
          (size.height * 0.22 * 360) /
            Math.max(1, Math.min(size.width, size.height)) /
            zoom,
      });
  }
  useEffect(() => {
    const element = surface.current;
    if (!element || preview) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [preview]);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const dragged = useRef(false);
  return (
    <div
      ref={surface}
      style={{
        position: "absolute",
        inset: 0,
        touchAction: preview ? "auto" : "none",
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
  );
}
export type MapProps = {
  preview?: boolean;
  onSelectSegment?: (id: string) => void;
  segments?: SegmentResult[];
  zoom?: number;
  mode?: string;
  metric?: "vc" | "collisions";
  crashSegmentIds?: Set<string>;
  /** Called when the map zooms itself to fit a selected segment. */
  onZoomTo?: (zoom: number) => void;
};
export function RoadMap({
  preview = false,
  onSelectSegment,
  segments,
  zoom = 1,
  mode = "Map",
  metric = "vc",
  crashSegmentIds,
  onZoomTo,
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
    () => visibleCrashPoints(state.files, crashSegmentIds),
    [state.files, crashSegmentIds],
  );
  const markers = useMemo(
    () => topSegmentMarkers(state.files, roads),
    [state.files, roads],
  );
  const heatMode = !preview && mode === "Heat";
  const crashHeat = heatMode && metric === "collisions";
  const crashDots = heatMode && state.crashPointsVisible;
  const vcHeat = heatMode && metric === "vc";
  // Segments picked on the map stay put; selections from elsewhere zoom to fit.
  const tapped = useRef<string | null>(null);
  const select = (id: string) => {
    tapped.current = id;
    if (onSelectSegment) onSelectSegment(id);
    else state.set({ selected: id });
  };
  const range = heatRange(roads, metric);
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
  const selectedSegment = roads.find((s) => s.id === state.selected);
  const [focus, setFocus] = useState<{ x: number; y: number; key: number }>();
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
    const cos = Math.cos((minLat * Math.PI) / 180);
    const base =
      320 /
      Math.max(
        Math.max((maxLon - minLon) * cos, 0.001),
        Math.max(maxLat - minLat, 0.001),
      );
    const lats = selectedSegment.geometry.map((p) => p[0]),
      lons = selectedSegment.geometry.map((p) => p[1]);
    const sMinLat = Math.min(...lats),
      sMaxLat = Math.max(...lats),
      sMinLon = Math.min(...lons),
      sMaxLon = Math.max(...lons);
    const extent =
      Math.max((sMaxLon - sMinLon) * cos, sMaxLat - sMinLat, 0.0005) * base;
    // Viewport center offsets are expressed in zoom-1 units, so they do not depend on zoom.
    setFocus({
      x: ((sMinLon + sMaxLon) / 2 - (minLon + maxLon) / 2) * cos * base,
      y: -((sMinLat + sMaxLat) / 2 - (minLat + maxLat) / 2) * base,
      key: Date.now(),
    });
    onZoomTo?.(Math.min(Math.max(200 / extent, 1), 1024));
  }, [preview, selectedSegment, minLat, maxLat, minLon, maxLon, onZoomTo]);
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
  const spanX = Math.max(
      (maxLon - minLon) * Math.cos((minLat * Math.PI) / 180),
      0.001,
    ),
    spanY = Math.max(maxLat - minLat, 0.001),
    scale = (320 / Math.max(spanX, spanY)) * zoom;
  const project = ([lat, lon]: number[]) =>
    `${180 + (lon - (minLon + maxLon) / 2) * Math.cos((minLat * Math.PI) / 180) * scale},${180 - (lat - (minLat + maxLat) / 2) * scale}`;
  return (
    <View style={{ flex: 1, backgroundColor: c.mapBackground }}>
      <MapSurface
        key={state.mapReset}
        zoom={zoom}
        preview={preview}
        focus={focus}
      >
        {data.wards.map((w, i) =>
          w.rings.map((ring, j) => (
            <Polygon
              key={`${i}-${j}`}
              points={ring.map(project).join(" ")}
              fill={c.wardFills[(w.id - 1) % c.wardFills.length]}
              fillOpacity={c.wardFillOpacity}
              stroke={c.wardStrokes[(w.id - 1) % c.wardStrokes.length]}
              strokeWidth={c.wardStrokeWidth}
            />
          )),
        )}
        {crashHeat && <CrashDensity points={crashPoints} project={project} />}
        {vcHeat &&
          c.heatGlowLayers.map((layer) =>
            roads.map((s) => {
              const value = heatValue(s, metric);
              if (value === undefined) return null;
              return (
                <WebPolyline
                  key={`heat-${layer.width}-${s.id}`}
                  points={s.geometry.map(project).join(" ")}
                  fill="none"
                  stroke={heatColor(value, range, c.heatColors, c.muted)}
                  strokeWidth={layer.width}
                  strokeOpacity={layer.opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              );
            }),
          )}
        {roads.map((s) => {
          const selected = s.id === state.selected;
          const color = selected
            ? c.primary
            : vcHeat
              ? heatColor(heatValue(s, metric), range, c.heatColors, c.muted)
              : segmentLengthColor(s.lengthMi);
          return (
            <WebPolyline
              key={s.id}
              points={s.geometry.map(project).join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={selected ? 5 : preview ? 1 : 2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              onClick={() => !preview && select(s.id)}
            />
          );
        })}
        {/* Draw the selected road last, with a dark casing so it stands out on any ward fill. */}
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
        {crashDots && (
          <CrashPointDots
            points={crashPoints}
            project={project}
            midLat={(minLat + maxLat) / 2}
            midLon={(minLon + maxLon) / 2}
            latScale={scale}
            lonScale={scale * Math.cos((minLat * Math.PI) / 180)}
          />
        )}
        {!preview &&
          markers.map((marker) => {
            const [cx, cy] = project(marker.point).split(",").map(Number);
            return (
              <G
                key={`rank-${marker.id}`}
                onClick={() => select(marker.id)}
                accessibilityLabel={`Published city combined rank ${marker.rank}: ${marker.road}`}
              >
                <Circle cx={cx} cy={cy} r={22} fill="transparent" />
                <Circle
                  cx={cx}
                  cy={cy}
                  r={10}
                  fill={c.crashMarker}
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
      {mode === "Satellite" && (
        <View
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            right: 12,
            backgroundColor: c.surface,
            padding: 10,
            borderRadius: 12,
          }}
        >
          <T muted size={12}>
            Satellite imagery is available in the mobile app.
          </T>
        </View>
      )}
    </View>
  );
}
