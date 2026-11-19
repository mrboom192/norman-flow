import { crashDensityImage } from "../analysis/crashDensityImage";
import { createCrashLocationIndex } from "../analysis/crashLocationIndex";
import Constants from "expo-constants";
import {
  topSegmentMarkers,
  visibleCrashPoints,
  heatRadiusPixels,
  crashClusters,
} from "../analysis/crashMap";
import {
  type MapMetric,
  rankBadges,
  rankedRows,
  segmentStyle,
  valueRange,
  wardBounds,
} from "../analysis/mapViews";
import { useEffect, useMemo, useRef, useState } from "react";
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
  metric?: MapMetric;
  scopeWard?: number;
  crashYear?: number;
  crashSegmentIds?: Set<string>;
  /** Web-only; native fits the camera to the selected segment itself. */
  onZoomTo?: (zoom: number) => void;
  /** Tapping inside a ward (not on a road) reports which ward it is. */
  onSelectWard?: (ward: number) => void;
  /** Ward to outline after a tap. */
  selectedWard?: number;
};
export function RoadMap({
  preview = false,
  onSelectSegment,
  segments,
  zoom = 1,
  mode = "Map",
  metric = "combined",
  scopeWard,
  crashYear,
  crashSegmentIds,
  onSelectWard,
  selectedWard,
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
  const googleMaps =
    Platform.OS === "android" ||
    (Constants.expoConfig?.extra?.googleMapsIosEnabled === true &&
      Constants.executionEnvironment !== "storeClient");
  const heatMode = !preview && mode === "Heat";
  const crashHeat = heatMode && metric === "crashes";
  const rankView = heatMode && metric !== "crashes" ? metric : undefined;
  const wardScope = rankView ? scopeWard : undefined;
  // Ranked roads for this view; recomputed from the loaded results so a new
  // import recolors the map immediately.
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
  const crashDots = crashHeat && state.crashPointsVisible;
  const [ready, setReady] = useState(false);
  // Segments picked on the map pan only; selections from elsewhere zoom to fit.
  const tapped = useRef<string | null>(null);
  const select = (id: string) => {
    tapped.current = id;
    if (onSelectSegment) onSelectSegment(id);
    else state.set({ selected: id });
  };
  const [mapSize, setMapSize] = useState({ width: 390, height: 700 });
  const [region, setRegion] = useState<Region>({
    latitude: 35.2226,
    longitude: -97.4395,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  });
  const locationIndex = useMemo(
    () => (crashDots ? createCrashLocationIndex(crashPoints) : undefined),
    [crashDots, crashPoints],
  );
  const sites = useMemo(
    () => locationIndex?.({ ...region, ...mapSize }) ?? [],
    [locationIndex, region, mapSize],
  );
  const selected = roads.find((s) => s.id === state.selected);
  const camera = useRef(region);
  const last = useRef({
    zoom,
    reset: state.mapReset,
    id: undefined as string | undefined,
  });
  useEffect(() => {
    if (preview || !ready) return;
    const previous = last.current;
    last.current = { zoom, reset: state.mapReset, id: selected?.id };
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
    } else if (
      selected &&
      previous.id !== selected.id &&
      tapped.current !== selected.id
    ) {
      tapped.current = null;
      map.current?.fitToCoordinates(
        selected.geometry.map(([latitude, longitude]) => ({
          latitude,
          longitude,
        })),
        {
          edgePadding: {
            top: 200,
            right: 70,
            // Keep the road above the half-height details sheet.
            bottom: Math.round(mapSize.height * 0.5),
            left: 50,
          },
          animated: true,
        },
      );
      return;
    } else if (selected && previous.id !== selected.id) {
      tapped.current = null;
      const point =
        selected.geometry[Math.floor(selected.geometry.length / 2)] ??
        selected.start;
      next = { ...next, latitude: point[0], longitude: point[1] };
    } else return;
    camera.current = next;
    map.current?.animateToRegion(next, 250);
  }, [preview, ready, zoom, state.mapReset, selected, mapSize.height]);
  // Zoom to the scoped ward (or back to the whole city) in Heat mode.
  const lastScope = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (preview || !ready || wardScope === lastScope.current) return;
    lastScope.current = wardScope;
    const box = wardScope ? wardBounds(data.wards, wardScope) : undefined;
    if (!box) {
      const city = {
        latitude: 35.2226,
        longitude: -97.4395,
        latitudeDelta: 0.25,
        longitudeDelta: 0.25,
      };
      camera.current = city;
      map.current?.animateToRegion(city, 250);
      return;
    }
    map.current?.fitToCoordinates(
      box.map(([latitude, longitude]) => ({ latitude, longitude })),
      {
        edgePadding: {
          top: 220,
          right: 60,
          bottom: Math.round(mapSize.height * 0.45),
          left: 40,
        },
        animated: true,
      },
    );
  }, [preview, ready, wardScope, data.wards, mapSize.height]);
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
        onMapReady={() => setReady(true)}
        onRegionChangeComplete={(nextRegion) => {
          camera.current = nextRegion;
          setRegion(nextRegion);
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
              Math.round(
                // In a ward view, the other wards fade so the focus ward stands out.
                c.wardFillOpacity *
                  (wardScope && w.id !== wardScope ? 0.3 : 1) *
                  255,
              )
                .toString(16)
                .padStart(2, "0")
            }
            strokeColor={
              wardScope && w.id !== wardScope
                ? c.divider
                : c.wardStrokes[(w.id - 1) % c.wardStrokes.length]
            }
            strokeWidth={c.wardStrokeWidth}
            tappable={!preview && Boolean(onSelectWard)}
            onPress={() => onSelectWard?.(w.id)}
          />
        ))}
        {/* Outline a tapped ward on top of its neighbours' shared edges. */}
        {!preview &&
          data.wards
            .filter((w) => w.id === selectedWard)
            .map((w) => (
              <Polygon
                key={`selected-ward-${w.id}`}
                coordinates={w.rings[0].map(([latitude, longitude]) => ({
                  latitude,
                  longitude,
                }))}
                fillColor="transparent"
                strokeColor={c.ink}
                strokeWidth={3}
                tappable={false}
                zIndex={1}
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
        {roads.flatMap((s) => {
          const style = styles?.get(s.id);
          const coordinates = s.geometry.map(([latitude, longitude]) => ({
            latitude,
            longitude,
          }));
          // Ranking views: unranked roads thin gray; better tiers thicker and on top.
          const width = styles ? (style ? [7, 6, 5, 4][style.tier] : 1.5) : 3;
          const zIndex = style ? 2 + (3 - style.tier) * 0.1 : 2;
          return [
            ...(style?.overCapacity
              ? [
                  <Polyline
                    key={`${s.id}-over`}
                    coordinates={coordinates}
                    strokeColor={c.ink}
                    strokeWidth={width + 4}
                    lineCap="round"
                    lineJoin="round"
                    tappable={false}
                    zIndex={zIndex - 0.05}
                  />,
                ]
              : []),
            <Polyline
              key={s.id}
              coordinates={coordinates}
              strokeColor={
                styles
                  ? (style?.color ?? c.unrankedRoad)
                  : segmentLengthColor(s.lengthMi, c)
              }
              strokeWidth={width}
              zIndex={zIndex}
              tappable
              onPress={() => select(s.id)}
            />,
          ];
        })}
        {/* Draw the selected road on top, with a dark casing so it stands out on any ward fill. */}
        {selected &&
          !preview &&
          [
            { color: c.ink, width: 10 },
            { color: c.primary, width: 6 },
          ].map((line) => (
            <Polyline
              key={`selected-${line.width}`}
              coordinates={selected.geometry.map(([latitude, longitude]) => ({
                latitude,
                longitude,
              }))}
              strokeColor={line.color}
              strokeWidth={line.width}
              lineCap="round"
              lineJoin="round"
              tappable={false}
              zIndex={line.width === 10 ? 3 : 4}
            />
          ))}
        {sites.map((site) => (
          <Marker
            key={site.id + ":" + site.count}
            coordinate={{ latitude: site.latitude, longitude: site.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            title={
              site.count === 1
                ? "Crash location"
                : site.count.toLocaleString() + " crashes"
            }
            zIndex={5}
          >
            <View
              style={{
                minWidth: site.count > 1 ? 30 : 9,
                height: site.count > 1 ? 25 : 9,
                borderRadius: 14,
                paddingHorizontal: site.count > 1 ? 5 : 0,
                borderWidth: 1,
                borderColor: c.white,
                backgroundColor: c.crashMarker,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {site.count > 1 && (
                <T size={11} style={{ color: c.white }}>
                  {site.count.toLocaleString()}+
                </T>
              )}
            </View>
          </Marker>
        ))}
        {[
          ...(crashHeat
            ? markers.map((m) => ({
                ...m,
                fill: c.crashMarker,
                title: `Citywide crash rank ${m.rank}`,
              }))
            : []),
          ...badges.map((b) => ({
            ...b,
            road: roads.find((s) => s.id === b.id)?.road ?? "",
            fill: c.ink,
            title: `Ward ${scopeWard} rank ${b.rank}`,
          })),
        ].map((marker) => (
          <Marker
            key={`${marker.title}-${marker.id}`}
            coordinate={{
              latitude: marker.point[0],
              longitude: marker.point[1],
            }}
            title={marker.title}
            description={marker.road}
            zIndex={10}
            tracksViewChanges={false}
            onPress={() => select(marker.id)}
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
                  backgroundColor: marker.fill,
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
