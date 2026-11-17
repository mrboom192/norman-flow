import { visibleCrashPoints } from "../analysis/crashMap";
import { fileDisplayName } from "../services/displayNames";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Map as MapIcon,
  Satellite,
  Flame,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sheet } from "../components/Sheet";
import { RoadMap } from "../components/RoadMap";
import { SegmentLengthLegend } from "../components/SegmentLengthLegend";
import { HeatLegend } from "../components/HeatLegend";
import {
  Button,
  Chip,
  Empty,
  IconButton,
  Input,
  Row,
  StatTile,
  T,
  WardPicker,
} from "../components/ui";
import { useFlow, visibleGeometry } from "../store/useFlow";
import { fonts, format, useTheme } from "../theme";
const mapModes = [
  { label: "Map", icon: MapIcon },
  { label: "Satellite", icon: Satellite },
  { label: "Heat", icon: Flame },
];
const snapPoints = ["45%", "90%"];
type MapSheet = "roads" | "filters" | "layers" | "";

export default function SearchScreen() {
  const c = useTheme(),
    insets = useSafeAreaInsets(),
    state = useFlow(),
    params = useLocalSearchParams<{ q?: string; panel?: string }>();
  const [query, setQuery] = useState(params.q ?? ""),
    [mode, setMode] = useState("Map"),
    [sheet, setSheetContent] = useState<Exclude<MapSheet, "">>("roads"),
    [sheetOpen, setSheetOpen] = useState(false),
    [zoom, setZoom] = useState(1),
    [wardFilter, setWardFilter] = useState(false),
    [lanes, setLanes] = useState(false),
    [crashes, setCrashes] = useState(false),
    [counts, setCounts] = useState(false),
    [metric, setMetric] = useState<"vc" | "collisions">("collisions");
  const [lastQuery, setLastQuery] = useState(params.q),
    [lastReset, setLastReset] = useState(state.mapReset);
  if (params.q !== lastQuery) {
    setLastQuery(params.q);
    setQuery(params.q ?? "");
  }
  if (state.mapReset !== lastReset) {
    setLastReset(state.mapReset);
    setZoom(1);
    setQuery("");
    setWardFilter(false);
    setLanes(false);
    setCrashes(false);
    setCounts(false);
  }
  const selected = state.results?.segments.find((s) => s.id === state.selected);
  const pendingNavigation = useRef<(() => void) | null>(null);
  // Open details for selections from the map or Rankings, only while Search is focused.
  useFocusEffect(
    useCallback(() => {
      if (selected?.id) setSheet("roads");
      return () => setSheet("");
    }, [selected?.id]),
  );
  useEffect(() => {
    if (params.panel === "layers") {
      // Present the sheet after the map screen has mounted and received focus.
      const frame = requestAnimationFrame(() => {
        setSheetContent("layers");
        setSheetOpen(true);
        router.setParams({ panel: undefined });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [params.panel]);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (sheetOpen) {
            setSheetOpen(false);
            return true;
          }
          if (!router.canGoBack()) {
            router.replace("/");
            return true;
          }
          return false;
        },
      );
      return () => subscription.remove();
    }, [sheetOpen]),
  );
  function setSheet(next: MapSheet) {
    if (next) setSheetContent(next);
    setSheetOpen(Boolean(next));
  }
  function navigateAfterClose(action: () => void) {
    pendingNavigation.current = action;
    setSheet("");
  }
  const matching = useMemo(() => {
    const visibleSegments = new Set(
      visibleGeometry(state.files).segments.map((s) => s.id),
    );
    return (
      state.results?.segments.filter(
        (s) =>
          visibleSegments.has(s.id) &&
          (!wardFilter || s.wards.includes(state.ward)) &&
          (!lanes || (s.lanes ?? 0) >= 4) &&
          (!crashes || (s.collisions ?? 0) > 0) &&
          (!counts || s.maxVolume !== undefined) &&
          (!query ||
            s.road.toLowerCase().includes(query.toLowerCase()) ||
            (/^ward\s*[1-8]$/i.test(query) &&
              s.wards.includes(Number(query.match(/[1-8]/)?.[0])))),
      ) ?? []
    );
  }, [
    state.files,
    state.results,
    state.ward,
    wardFilter,
    lanes,
    crashes,
    counts,
    query,
  ]);
  const crashSegmentIds = useMemo(
    () =>
      wardFilter || lanes || crashes || counts || query
        ? new Set(matching.map((s) => s.id))
        : undefined,
    [wardFilter, lanes, crashes, counts, query, matching],
  );
  const crashCount = useMemo(
    () => visibleCrashPoints(state.files, crashSegmentIds).length,
    [state.files, crashSegmentIds],
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={StyleSheet.absoluteFill}>
        <RoadMap
          segments={matching}
          zoom={zoom}
          mode={mode}
          metric={metric}
          crashSegmentIds={crashSegmentIds}
          onSelectSegment={(id) => {
            state.set({ selected: id });
            setSheet("roads");
          }}
        />
        <View
          style={{
            position: "absolute",
            left: Math.max(16, insets.left),
            right: Math.max(16, insets.right),
            top: insets.top + 16,
            gap: 10,
          }}
          pointerEvents="box-none"
        >
          <Row>
            <IconButton
              icon={ArrowLeft}
              label="Back from map"
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace("/");
              }}
            />
            <Input
              search
              value={query}
              onChangeText={setQuery}
              placeholder="Find a street or ward"
              style={{ flex: 1 }}
            />
            <IconButton
              icon={SlidersHorizontal}
              label="Map filters"
              onPress={() => setSheet("filters")}
            />
          </Row>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {wardFilter && (
              <Chip
                label={`Ward ${state.ward} ×`}
                onPress={() => setWardFilter(false)}
              />
            )}
            {lanes && (
              <Chip label="4+ lanes ×" onPress={() => setLanes(false)} />
            )}
            {crashes && (
              <Chip
                label="Has collisions ×"
                onPress={() => setCrashes(false)}
              />
            )}
            {counts && (
              <Chip
                label="Has traffic count ×"
                onPress={() => setCounts(false)}
              />
            )}
          </View>
          <View
            pointerEvents="box-none"
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                padding: 4,
                borderRadius: 14,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              {mapModes.map(({ label: m, icon: Icon }) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMode(m);
                    if (m === "Heat" && metric === "collisions")
                      state.set({ crashHeatmapVisible: true });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={m}
                  accessibilityState={{ selected: m === mode }}
                  style={{
                    minHeight: 44,
                    width: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    backgroundColor: m === mode ? c.primary : "transparent",
                  }}
                >
                  <Icon size={21} color={m === mode ? c.onPrimary : c.muted} />
                </Pressable>
              ))}
            </View>
            <View style={{ gap: 8 }}>
              <IconButton
                icon={Layers}
                label="Files on this map"
                onPress={() => setSheet("layers")}
                style={{ borderRadius: 14 }}
              />
              <IconButton
                icon={RotateCcw}
                label="Reset map"
                onPress={() => {
                  setZoom(1);
                  setQuery("");
                  state.set({ selected: null, mapReset: state.mapReset + 1 });
                }}
                style={{ borderRadius: 14 }}
              />
              <IconButton
                icon={Plus}
                label="Zoom in"
                onPress={() => setZoom(Math.min(zoom * 1.4, 1024))}
                style={{ borderRadius: 14 }}
              />
              <IconButton
                icon={Minus}
                label="Zoom out"
                onPress={() => setZoom(Math.max(zoom / 1.4, 0.5))}
                style={{ borderRadius: 14 }}
              />
            </View>
          </View>
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 20,
          left: Math.max(20, insets.left),
          right: Math.max(20, insets.right),
          gap: 12,
        }}
      >
        {mode !== "Heat" && !state.crashHeatmapVisible && (
          <View
            style={{
              padding: 10,
              borderRadius: 12,
              backgroundColor: c.surface,
            }}
          >
            <SegmentLengthLegend />
          </View>
        )}
        {(mode === "Heat" || state.crashHeatmapVisible) && (
          <View
            style={{
              padding: 10,
              borderRadius: 12,
              backgroundColor: c.surface,
            }}
          >
            <Row>
              <Chip
                label="V/C"
                active={metric === "vc"}
                onPress={() => {
                  setMetric("vc");
                  state.set({ crashHeatmapVisible: false });
                }}
              />
              <Chip
                label="Crash density"
                active={metric === "collisions"}
                onPress={() => {
                  setMetric("collisions");
                  state.set({ crashHeatmapVisible: true });
                }}
              />
            </Row>
            <HeatLegend
              segments={matching}
              metric={state.crashHeatmapVisible ? "collisions" : metric}
              crashCount={crashCount}
            />
          </View>
        )}
        {!matching.length && (
          <View
            style={{
              backgroundColor: c.surface,
              padding: 14,
              borderRadius: 14,
            }}
          >
            <T muted size={12}>
              {state.results?.segments.length
                ? "No visible roads match. Clear your search or filters, or check the map layers."
                : "Import road segments to display your analysis."}
            </T>
          </View>
        )}
        <Button
          label={
            selected ? `View ${selected.road} details` : "Explore road segments"
          }
          onPress={() => setSheet("roads")}
        />
      </View>
      <Sheet
        visible={sheetOpen}
        snapPoints={snapPoints}
        title={
          sheet === "filters"
            ? "Filter the map"
            : sheet === "layers"
              ? "Files on this map"
              : selected
                ? "Segment details"
                : "Road segments"
        }
        onClose={() => setSheet("")}
        onDismiss={() => {
          const navigate = pendingNavigation.current;
          pendingNavigation.current = null;
          navigate?.();
        }}
      >
        {sheet === "roads" ? (
          <>
            {selected ? (
              <>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T heading size={23}>
                      {selected.road}
                    </T>
                    <T muted size={12}>
                      Segment {selected.index} of {selected.of} · Ward{" "}
                      {selected.wardMajority ||
                        selected.wards.join(", ") ||
                        "—"}
                    </T>
                  </View>
                </Row>
                <Button
                  label="See its rank"
                  onPress={() => {
                    if (selected.wards.length)
                      state.set({ ward: selected.wards[0] });
                    navigateAfterClose(() => router.dismissTo("/ranks"));
                  }}
                />
                <Row>
                  <StatTile value={format(selected.vc, 2)} label="V/C ratio" />
                  <StatTile
                    value={format(selected.maxVolume)}
                    label="Max traffic count"
                  />
                  <StatTile
                    value={format(selected.collisions)}
                    label="Collisions"
                  />
                </Row>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  {[
                    ...(selected.preparedStatus
                      ? [
                          [
                            "Status",
                            !selected.rankable ||
                            selected.maxVolume === undefined ||
                            selected.summarySource
                              ? selected.preparedStatus
                              : "Traffic available",
                          ],
                          ...(selected.laneSource
                            ? [["Lane source", selected.laneSource]]
                            : []),
                        ]
                      : []),
                    ["Segment length", `${selected.lengthMi.toFixed(2)} mi`],
                    [
                      "Total street length",
                      `${selected.roadTotalMi.toFixed(2)} mi`,
                    ],
                    [
                      selected.preparedStatus ? "Lanes" : "Lanes (GIS)",
                      `${format(selected.lanes)} · ${selected.travelDirection || "—"}`,
                    ],
                    [
                      "Wards touched",
                      selected.wards
                        .map(
                          (w) =>
                            `${w}${w === selected.wardMajority ? " (majority)" : ""}`,
                        )
                        .join(", ") || "—",
                    ],
                    ["Start", selected.start.join(", ")],
                    ["End", selected.end.join(", ")],
                  ].map(([label, value]) => (
                    <View key={label} style={{ width: "47%" }}>
                      <T muted size={11}>
                        {label}
                      </T>
                      <T size={12} style={{ fontFamily: fonts.bold }}>
                        {value}
                      </T>
                    </View>
                  ))}
                </View>
                {selected.laneCoverage != null &&
                  selected.laneCoverage < 100 && (
                    <View
                      style={{
                        backgroundColor: c.chipTint,
                        padding: 10,
                        borderRadius: 12,
                      }}
                    >
                      <T size={12} style={{ color: c.primaryDeep }}>
                        Lane count only mapped for {selected.laneCoverage}% of
                        this segment — check the aerial view.
                      </T>
                    </View>
                  )}
              </>
            ) : matching.length ? (
              <>
                <T heading size={20}>
                  {matching.length} road segments
                </T>
                <T muted size={12}>
                  Tap a line or select a road to inspect its details.
                </T>
                {matching.slice(0, 20).map((s) => (
                  <Button
                    key={s.id}
                    outline
                    label={`${s.road} · ${s.index} of ${s.of}`}
                    onPress={() => state.set({ selected: s.id })}
                  />
                ))}
              </>
            ) : (
              <Empty
                title={
                  state.results
                    ? "No matching roads"
                    : "Explore your road network"
                }
                body={
                  state.results
                    ? "Try clearing your search or filters."
                    : "Add a KML or KMZ file to put Norman’s segments and wards on the map."
                }
                action={() => navigateAfterClose(() => router.push("/import"))}
              />
            )}
          </>
        ) : sheet === "filters" ? (
          <>
            <WardPicker />
            {[
              ["Selected ward", wardFilter, setWardFilter],
              ["4+ lanes", lanes, setLanes],
              ["Has collisions", crashes, setCrashes],
              ["Has traffic count", counts, setCounts],
            ].map(([label, value, setter]) => (
              <Row key={String(label)}>
                <T>{String(label)}</T>
                <Switch
                  accessibilityLabel={String(label)}
                  value={Boolean(value)}
                  onValueChange={setter as (v: boolean) => void}
                  trackColor={{ true: c.primary }}
                />
              </Row>
            ))}
            <Button label="Apply filters" onPress={() => setSheet("")} />
          </>
        ) : (
          <>
            <Button
              outline
              label="Upload CSV, XLSX, KML, KMZ or GeoJSON"
              onPress={() => {
                navigateAfterClose(() => router.push("/import"));
              }}
            />
            <T heading size={18}>
              Crash layers
            </T>
            <T muted size={12}>
              Zoom in to separate nearby crash locations. The heatmap blends
              crashes into stronger hotspots within about 200 metres.
            </T>
            {[
              [
                "Crash locations",
                "Count badges for groups · dots for individual crashes",
                "crashPointsVisible",
              ],
              [
                "Crash heatmap",
                "Blurred density · nearby crashes add together",
                "crashHeatmapVisible",
              ],
            ].map(([label, description, key]) => (
              <Row key={key} style={{ minHeight: 56 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <T size={13}>{label}</T>
                  <T muted size={11}>
                    {description}
                  </T>
                </View>
                <Switch
                  accessibilityLabel={`Show ${label} layer`}
                  value={
                    key === "crashPointsVisible"
                      ? state.crashPointsVisible
                      : state.crashHeatmapVisible
                  }
                  onValueChange={(value) => {
                    state.set(
                      key === "crashPointsVisible"
                        ? { crashPointsVisible: value }
                        : { crashHeatmapVisible: value },
                    );
                    if (
                      key === "crashHeatmapVisible" &&
                      !value &&
                      mode === "Heat" &&
                      metric === "collisions"
                    )
                      setMode("Map");
                  }}
                  trackColor={{ true: c.primary }}
                />
              </Row>
            ))}
            <T muted size={12}>
              {crashCount.toLocaleString()} crash locations available with the
              current filters. Both layers use the same source file below.
            </T>
            <T heading size={18}>
              Source files
            </T>
            {state.files.length ? (
              state.files.map((f) => (
                <Row key={`${f.source ?? "uploaded"}:${f.name}`}>
                  <View style={{ flex: 1 }}>
                    <T size={13}>{fileDisplayName(f)}</T>
                    <T muted size={11}>
                      {f.summary}
                    </T>
                  </View>
                  <Switch
                    accessibilityLabel={`Show ${fileDisplayName(f)} source file`}
                    value={f.visible}
                    onValueChange={(visible) =>
                      state.set({
                        files: state.files.map((x) =>
                          x === f ? { ...x, visible } : x,
                        ),
                      })
                    }
                    trackColor={{ true: c.primary }}
                  />
                </Row>
              ))
            ) : (
              <T muted>No files loaded yet.</T>
            )}
          </>
        )}
      </Sheet>
    </View>
  );
}
