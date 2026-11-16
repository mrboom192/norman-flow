import { View } from "react-native";
import Svg, {
  Path,
  Polyline,
  Polygon,
  Defs,
  Pattern,
  Rect,
} from "react-native-svg";
import { useTheme } from "../theme";
import { useFlow, visibleGeometry } from "../store/useFlow";
import { SegmentResult } from "../analysis/types";
import { T } from "./ui";
export type MapProps = {
  preview?: boolean;
  onSelectSegment?: (id: string) => void;
  segments?: SegmentResult[];
  zoom?: number;
  mode?: string;
  metric?: "vc" | "collisions";
};
export function RoadMap({
  preview = false,
  onSelectSegment,
  segments,
  zoom = 1,
  mode = "Map",
  metric = "vc",
}: MapProps) {
  const c = useTheme(),
    state = useFlow(),
    data = visibleGeometry(state.files),
    roads =
      segments ??
      state.results?.segments.filter((s) =>
        data.segments.some((d) => d.id === s.id),
      ) ??
      [];
  const points = [
    ...roads.flatMap((s) => s.geometry),
    ...data.wards.flatMap((w) => w.rings.flat()),
  ];
  if (!points.length)
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
  const lats = points.map((p) => p[0]),
    lons = points.map((p) => p[1]),
    minLat = Math.min(...lats),
    maxLat = Math.max(...lats),
    minLon = Math.min(...lons),
    maxLon = Math.max(...lons);
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
      <Svg width="100%" height="100%" viewBox="0 0 360 360">
        {data.wards.map((w, i) =>
          w.rings.map((ring, j) => (
            <Polygon
              key={`${i}-${j}`}
              points={ring.map(project).join(" ")}
              fill={
                state.colorblind
                  ? w.id % 2
                    ? c.blueTint
                    : "#FBEAD5"
                  : c.wardFills[(w.id - 1) % 4]
              }
              fillOpacity={0.7}
              stroke={c.border}
              strokeWidth={0.8}
            />
          )),
        )}
        {roads.map((s) => {
          const selected = s.id === state.selected;
          const high = metric === "vc" ? (s.vc ?? 0) >= 1 : s.collisions > 0;
          const color = selected
            ? state.colorblind
              ? c.orange
              : c.primary
            : mode === "Heat"
              ? (metric === "vc" ? s.vc : s.maxVolume) === undefined
                ? c.muted
                : high
                  ? c.orange
                  : c.blue
              : c.mapBlue;
          return (
            <Polyline
              key={s.id}
              points={s.geometry.map(project).join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={selected ? 5 : preview ? 1 : 2.5}
              strokeLinecap="round"
              onPress={() =>
                !preview &&
                (onSelectSegment
                  ? onSelectSegment(s.id)
                  : state.set({ selected: s.id }))
              }
            />
          );
        })}
      </Svg>
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
