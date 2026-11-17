import Svg from "react-native-svg";
import { crashDensityImage } from "../analysis/crashDensityImage";
import { CrashPointDots } from "./CrashPointDots";
import Constants from "expo-constants";
import {
  topSegmentMarkers,
  visibleCrashPoints,
  heatRadiusPixels,
  crashClusters,
} from "../analysis/crashMap";
import { heatColor, heatRange, heatValue } from "../analysis/heatmap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import MapView, {
  type Region,
  Heatmap,
  Marker,
  Overlay,
  PROVIDER_GOOGLE,
  Polygon,
  Polyline,
} from "react-native-maps";
import { segmentLengthColor, useTheme } from "../theme";
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
  crashSegmentIds?: Set<string>;
};
export function RoadMap({
  preview = false,
  onSelectSegment,
  segments,
  zoom = 1,
  mode = "Map",
  metric = "vc",
  crashSegmentIds,
}: MapProps) {
  const c = useTheme(),
    state = useFlow(),
    map = useRef<MapView>(null),
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
  const googleMaps =
    Platform.OS === "android" ||
    (Constants.expoConfig?.extra?.googleMapsIosEnabled === true &&
      Constants.executionEnvironment !== "storeClient");
  const crashHeat = !preview && state.crashHeatmapVisible;
  const weightedPoints = useMemo(
    () =>
      crashHeat && googleMaps
        ? crashClusters(crashPoints).map(({ latitude, longitude, count }) => ({
            latitude,
            longitude,
            weight: count,
          }))
        : [],
    [crashPoints, crashHeat, googleMaps],
  );
  const densityImage = useMemo(
    () =>
      crashHeat && !googleMaps
        ? crashDensityImage(crashPoints, c.crashHeatColors)
        : undefined,
    [crashHeat, googleMaps, crashPoints, c.crashHeatColors],
  );
  const crashDots = !preview && state.crashPointsVisible;
  const vcHeat = mode === "Heat" && metric === "vc";
  const [mapSize, setMapSize] = useState({ width: 390, height: 700 });
  const [moving, setMoving] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 35.2226,
    longitude: -97.4395,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  });
  const project = useCallback(
    ([lat, lon]: number[]) =>
      `${(0.5 + (lon - region.longitude) / region.longitudeDelta) * mapSize.width},${(0.5 - (lat - region.latitude) / region.latitudeDelta) * mapSize.height}`,
    [region, mapSize],
  );
  const range = heatRange(roads, metric);
  const selected = roads.find((s) => s.id === state.selected);
  const camera = useRef(region);
  const last = useRef({
    zoom,
    reset: state.mapReset,
    id: undefined as string | undefined,
  });
  useEffect(() => {
    const previous = last.current;
    last.current = { zoom, reset: state.mapReset, id: selected?.id };
    if (preview) return;
    let next = camera.current;
    if (previous.reset !== state.mapReset) {
      next = {
        latitude: 35.2226,
        longitude: -97.4395,
        latitudeDelta: 0.25,
        longitudeDelta: 0.25,
      };
    } else if (previous.zoom !== zoom) {
      const factor = previous.zoom / zoom;
      next = {
        ...next,
        latitudeDelta: next.latitudeDelta * factor,
        longitudeDelta: next.longitudeDelta * factor,
      };
    } else if (selected && previous.id !== selected.id) {
      const point =
        selected.geometry[Math.floor(selected.geometry.length / 2)] ??
        selected.start;
      next = { ...next, latitude: point[0], longitude: point[1] };
    } else return;
    camera.current = next;
    map.current?.animateToRegion(next, 250);
  }, [preview, zoom, state.mapReset, selected]);
  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={map}
        provider={googleMaps ? PROVIDER_GOOGLE : undefined}
        onLayout={(event) =>
          setMapSize({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }
        onRegionChange={crashDots ? () => setMoving(true) : undefined}
        onRegionChangeComplete={(nextRegion) => {
          camera.current = nextRegion;
          setRegion(nextRegion);
          setMoving(false);
        }}
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
        rotateEnabled={!preview && !crashDots && !crashHeat}
        pitchEnabled={!crashDots && !crashHeat}
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
            fillColor={
              c.wardFills[(w.id - 1) % c.wardFills.length] +
              Math.round(c.wardFillOpacity * (crashHeat ? 0.25 : 1) * 255)
                .toString(16)
                .padStart(2, "0")
            }
            strokeColor={c.wardStrokes[(w.id - 1) % c.wardStrokes.length]}
            strokeWidth={c.wardStrokeWidth}
          />
        ))}
        {densityImage && (
          <Overlay
            bounds={densityImage.bounds}
            image={{ uri: densityImage.uri }}
          />
        )}
        {crashHeat && googleMaps && weightedPoints.length > 0 && (
          <Heatmap
            points={weightedPoints}
            radius={heatRadiusPixels(region.latitudeDelta, mapSize.height)}
            opacity={0.8}
            gradient={{
              colors: c.crashHeatColors,
              startPoints: [0, 0.25, 0.5, 0.75, 1],
              colorMapSize: 256,
            }}
          />
        )}
        {vcHeat &&
          c.heatGlowLayers.map((layer) =>
            roads.map((s) => {
              const value = heatValue(s, metric);
              if (value === undefined) return null;
              const color = heatColor(value, range, c.heatColors, c.muted);
              return (
                <Polyline
                  key={`heat-${layer.width}-${s.id}`}
                  coordinates={s.geometry.map(([latitude, longitude]) => ({
                    latitude,
                    longitude,
                  }))}
                  strokeColor={
                    color +
                    Math.round(layer.opacity * 255)
                      .toString(16)
                      .padStart(2, "0")
                  }
                  strokeWidth={layer.width}
                  lineCap="round"
                  lineJoin="round"
                  tappable={false}
                  zIndex={1}
                />
              );
            }),
          )}
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
                : crashHeat
                  ? c.muted + "66"
                  : vcHeat
                    ? heatColor(
                        heatValue(s, metric),
                        range,
                        c.heatColors,
                        c.muted,
                      )
                    : segmentLengthColor(s.lengthMi)
            }
            strokeWidth={s.id === state.selected ? 6 : crashHeat ? 1 : 3}
            zIndex={2}
            tappable
            onPress={() =>
              onSelectSegment
                ? onSelectSegment(s.id)
                : state.set({ selected: s.id })
            }
          />
        ))}
        {!preview &&
          markers.map((marker) => (
            <Marker
              key={`rank-${marker.id}`}
              coordinate={{
                latitude: marker.point[0],
                longitude: marker.point[1],
              }}
              title={`Published city combined rank ${marker.rank}`}
              description={marker.road}
              zIndex={10}
              tracksViewChanges={false}
              onPress={() =>
                onSelectSegment
                  ? onSelectSegment(marker.id)
                  : state.set({ selected: marker.id })
              }
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: c.crashMarker,
                    borderWidth: 2,
                    borderColor: c.white,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <T size={13} style={{ color: c.white }}>
                    {marker.rank}
                  </T>
                </View>
              </View>
            </Marker>
          ))}
      </MapView>
      {crashDots && (
        <View
          pointerEvents="none"
          style={{
            opacity: moving ? 0 : 1,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <Svg width="100%" height="100%">
            {crashDots && (
              <CrashPointDots
                points={crashPoints}
                project={project}
                radius={1.8}
              />
            )}
          </Svg>
        </View>
      )}
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
