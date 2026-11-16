import { useEffect, useRef } from "react";
import { View } from "react-native";
import MapView, { Polygon, Polyline } from "react-native-maps";
import { useTheme } from "../theme";
import { useFlow, visibleGeometry } from "../store/useFlow";
import { SegmentResult } from "../analysis/types";
import { T } from "./ui";
type MapProps = {
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
    map = useRef<MapView>(null),
    data = visibleGeometry(state.files),
    roads =
      segments ??
      state.results?.segments.filter((s) =>
        data.segments.some((d) => d.id === s.id),
      ) ??
      [];
  const selected = roads.find((s) => s.id === state.selected);
  useEffect(() => {
    map.current?.animateToRegion(
      {
        latitude: selected?.start[0] ?? 35.2226,
        longitude: selected?.start[1] ?? -97.4395,
        latitudeDelta: 0.25 / zoom,
        longitudeDelta: 0.25 / zoom,
      },
      250,
    );
  }, [zoom, state.mapReset, selected]);
  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={map}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 35.2226,
          longitude: -97.4395,
          latitudeDelta: 0.25,
          longitudeDelta: 0.25,
        }}
        mapType={mode === "Satellite" ? "satellite" : "standard"}
        scrollEnabled={!preview}
        zoomEnabled={!preview}
        rotateEnabled={!preview}
      >
        {data.wards.map((w, i) => (
          <Polygon
            key={i}
            coordinates={w.rings[0].map(([latitude, longitude]) => ({
              latitude,
              longitude,
            }))}
            holes={w.rings
              .slice(1)
              .map((r) =>
                r.map(([latitude, longitude]) => ({ latitude, longitude })),
              )}
            fillColor={c.wardFills[(w.id - 1) % 4] + "80"}
            strokeColor={c.border}
          />
        ))}
        {roads.map((s) => (
          <Polyline
            key={s.id}
            coordinates={s.geometry.map(([latitude, longitude]) => ({
              latitude,
              longitude,
            }))}
            strokeColor={
              s.id === state.selected
                ? c.primary
                : mode === "Heat"
                  ? (metric === "vc" ? (s.vc ?? 0) >= 1 : s.collisions > 0)
                    ? c.orange
                    : c.blue
                  : c.mapBlue
            }
            strokeWidth={s.id === state.selected ? 6 : 3}
            tappable
            onPress={() =>
              onSelectSegment
                ? onSelectSegment(s.id)
                : state.set({ selected: s.id })
            }
          />
        ))}
      </MapView>
      {preview && !roads.length && (
        <View
          style={{
            position: "absolute",
            bottom: 18,
            left: 20,
            right: 20,
            backgroundColor: c.surface,
            padding: 14,
            borderRadius: 14,
          }}
        >
          <T muted size={12}>
            Import road segments to display your analysis.
          </T>
        </View>
      )}
    </View>
  );
}
