import { visibleCrashPoints } from "../analysis/crashMap";
import type { SegmentResult } from "../analysis/types";
import { fileDisplayName } from "../services/displayNames";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  Flame,
  Layers,
  type LucideIcon,
  Map as MapIcon,
  Minus,
  Plus,
  RotateCcw,
  Satellite,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeatPanel } from "../components/HeatPanel";
import type { MapMetric } from "../analysis/mapViews";
import { RoadMap } from "../components/RoadMap";
import { SegmentLengthLegend } from "../components/SegmentLengthLegend";
import { Sheet } from "../components/Sheet";
import {
  Button,
  Empty,
  FileBadge,
  Input,
  Row,
  T,
  Toggle,
  WardPicker,
} from "../components/ui";
import { useFlow, visibleGeometry } from "../store/useFlow";
import { fonts, format, segmentLengthColor, useTheme } from "../theme";

const mapModes: { label: string; icon: LucideIcon }[] = [
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
    [metric, setMetric] = useState<MapMetric>("combined"),
    [scopeWard, setScopeWard] = useState<number | undefined>(undefined),
    [crashYear, setCrashYear] = useState<number | undefined>(undefined);
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
  const hotspotYears = useMemo(
    () =>
      [
        ...new Set(
          visibleCrashPoints(state.files)
            .map((p) => p.year)
            .filter((y) => y > 0),
        ),
      ].sort((a, b) => a - b),
    [state.files],
  );
  const crashCount = useMemo(
    () =>
      visibleCrashPoints(state.files, crashSegmentIds).filter(
        (p) => crashYear === undefined || p.year === crashYear,
      ).length,
    [state.files, crashSegmentIds, crashYear],
  );
  const filters = [
    {
      label: "Selected ward",
      chip: `Ward ${state.ward}`,
      value: wardFilter,
      set: setWardFilter,
    },
    { label: "4+ lanes", chip: "4+ lanes", value: lanes, set: setLanes },
    {
      label: "Has collisions",
      chip: "Has collisions",
      value: crashes,
      set: setCrashes,
    },
    {
      label: "Has traffic count",
      chip: "Has traffic count",
      value: counts,
      set: setCounts,
    },
  ];
  const activeFilters = filters.filter((f) => f.value);
  const float: ViewStyle = { boxShadow: c.floatShadow };
  const gutter = {
    left: Math.max(16, insets.left),
    right: Math.max(16, insets.right),
  };
  const wardLabel = (s: SegmentResult) =>
    `Ward ${s.wardMajority || s.wards.join(", ") || "—"}`;

  return (
    <View style={{ flex: 1, backgroundColor: c.mapBackground }}>
      <View style={StyleSheet.absoluteFill}>
        <RoadMap
          segments={matching}
          zoom={zoom}
          mode={mode}
          metric={metric}
          scopeWard={scopeWard}
          crashYear={crashYear}
          crashSegmentIds={crashSegmentIds}
          onZoomTo={setZoom}
          onSelectSegment={(id) => {
            state.set({ selected: id });
            setSheet("roads");
          }}
        />
      </View>

      {/* Top: search, mode switch, active filters and map controls */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + 12,
          ...gutter,
          gap: 10,
        }}
      >
        <Row style={{ gap: 10 }}>
          <RoundButton
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
            style={{ flex: 1, borderWidth: 0, ...float }}
          />
          <RoundButton
            icon={SlidersHorizontal}
            label="Map filters"
            badge={activeFilters.length}
            onPress={() => setSheet("filters")}
          />
        </Row>
        <View
          style={{
            flexDirection: "row",
            padding: 4,
            borderRadius: 999,
            backgroundColor: c.surface,
            ...float,
          }}
        >
          {mapModes.map(({ label, icon: Icon }) => {
            const active = label === mode;
            return (
              <Pressable
                key={label}
                onPress={() => setMode(label)}
                accessibilityRole="button"
                accessibilityLabel={`${label} view`}
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  flexDirection: "row",
                  gap: 6,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: active ? c.primary : "transparent",
                }}
              >
                <Icon size={17} color={active ? c.onPrimary : c.muted} />
                <T
                  size={13}
                  style={{
                    fontFamily: fonts.bold,
                    color: active ? c.onPrimary : c.muted,
                  }}
                >
                  {label}
                </T>
              </Pressable>
            );
          })}
        </View>
        <Row style={{ alignItems: "flex-start" }}>
          <View
            pointerEvents="box-none"
            style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 }}
          >
            {activeFilters.map((f) => (
              <FilterPill
                key={f.label}
                label={f.chip}
                onRemove={() => f.set(false)}
              />
            ))}
          </View>
          <View
            style={{
              width: 48,
              borderRadius: 24,
              backgroundColor: c.surface,
              overflow: "hidden",
              ...float,
            }}
          >
            <StackButton
              icon={Layers}
              label="Files on this map"
              onPress={() => setSheet("layers")}
            />
            <StackButton
              icon={RotateCcw}
              label="Reset map"
              onPress={() => {
                setZoom(1);
                setQuery("");
                state.set({ selected: null, mapReset: state.mapReset + 1 });
              }}
            />
            <View
              style={{
                height: 1,
                marginHorizontal: 10,
                backgroundColor: c.divider,
              }}
            />
            <StackButton
              icon={Plus}
              label="Zoom in"
              onPress={() => setZoom(Math.min(zoom * 1.4, 1024))}
            />
            <StackButton
              icon={Minus}
              label="Zoom out"
              onPress={() => setZoom(Math.max(zoom / 1.4, 0.5))}
            />
          </View>
        </Row>
      </View>

      {/* Bottom: legend or heat controls, then the selected road */}
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 16,
          ...gutter,
          backgroundColor: c.surface,
          borderRadius: 24,
          padding: 16,
          gap: 12,
          ...float,
        }}
      >
        {mode === "Heat" ? (
          <HeatPanel
            metric={metric}
            onMetric={setMetric}
            scopeWard={scopeWard}
            onScopeWard={setScopeWard}
            crashYear={crashYear}
            onCrashYear={setCrashYear}
            segments={matching}
            crashCount={crashCount}
            hotspotYears={hotspotYears}
            onSelect={(id) => {
              state.set({ selected: id });
              setSheet("roads");
            }}
          />
        ) : (
          <View style={{ gap: 6 }}>
            <T heading size={15}>
              {matching.length
                ? `${matching.length.toLocaleString()} road segments`
                : "Road segments"}
            </T>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
              }}
            >
              <SegmentLengthLegend />
              <WardSwatches />
            </View>
          </View>
        )}
        {!matching.length && (
          <T muted size={12}>
            {state.results?.segments.length
              ? "No visible roads match. Clear your search or filters, or check the map layers."
              : "Import road segments to display your analysis."}
          </T>
        )}
        {selected ? (
          <Pressable
            onPress={() => setSheet("roads")}
            accessibilityRole="button"
            accessibilityLabel={`View ${selected.road} details`}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 12,
              borderRadius: 18,
              backgroundColor: c.dataSurface,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View
              style={{
                width: 6,
                alignSelf: "stretch",
                borderRadius: 3,
                backgroundColor: c.primary,
              }}
            />
            <View style={{ flex: 1 }}>
              <T heading size={16} numberOfLines={1}>
                {selected.road}
              </T>
              <T muted size={11}>
                {[
                  `Segment ${selected.index} of ${selected.of}`,
                  wardLabel(selected),
                  selected.vc != null && `V/C ${format(selected.vc, 2)}`,
                  selected.collisions != null &&
                    `${format(selected.collisions)} crashes`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </T>
            </View>
            <ChevronRight size={20} color={c.muted} />
          </Pressable>
        ) : (
          <Button
            label="Explore road segments"
            onPress={() => setSheet("roads")}
          />
        )}
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
                ? selected.road
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
          selected ? (
            <>
              <Row>
                <T muted size={13} style={{ flex: 1 }}>
                  Segment {selected.index} of {selected.of} ·{" "}
                  {wardLabel(selected)}
                </T>
                <Pressable
                  onPress={() => state.set({ selected: null })}
                  accessibilityRole="button"
                  accessibilityLabel="Back to all road segments"
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <T
                    size={13}
                    style={{ fontFamily: fonts.bold, color: c.primaryText }}
                  >
                    All roads
                  </T>
                </Pressable>
              </Row>
              <Row style={{ gap: 10, alignItems: "stretch" }}>
                <Metric value={format(selected.vc, 2)} label="V/C ratio" />
                <Metric
                  value={format(selected.maxVolume)}
                  label="Max traffic"
                />
                <Metric
                  value={format(selected.collisions)}
                  label="Collisions"
                />
              </Row>
              {selected.laneCoverage != null && selected.laneCoverage < 100 && (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                    backgroundColor: c.chipTint,
                    padding: 12,
                    borderRadius: 16,
                  }}
                >
                  <TriangleAlert size={18} color={c.primaryDeep} />
                  <T size={12} style={{ flex: 1, color: c.primaryDeep }}>
                    Lane count only mapped for {selected.laneCoverage}% of this
                    segment — check the aerial view.
                  </T>
                </View>
              )}
              <View
                style={{
                  backgroundColor: c.dataSurface,
                  borderRadius: 22,
                  paddingHorizontal: 16,
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
                ].map(([label, value], i) => (
                  <Row
                    key={label}
                    style={{
                      minHeight: 46,
                      gap: 16,
                      borderTopWidth: i ? 1 : 0,
                      borderColor: c.divider,
                    }}
                  >
                    <T muted size={13}>
                      {label}
                    </T>
                    <T
                      size={13}
                      style={{
                        fontFamily: fonts.bold,
                        flexShrink: 1,
                        textAlign: "right",
                      }}
                    >
                      {value}
                    </T>
                  </Row>
                ))}
              </View>
              <Button
                label="See its rank"
                onPress={() => {
                  if (selected.wards.length)
                    state.set({ ward: selected.wards[0] });
                  navigateAfterClose(() => router.dismissTo("/ranks"));
                }}
              />
            </>
          ) : matching.length ? (
            <>
              <T muted size={13}>
                {matching.length.toLocaleString()} segments · tap one to inspect
                it
              </T>
              <View>
                {matching.slice(0, 20).map((s, i) => (
                  <Pressable
                    key={s.id}
                    onPress={() => state.set({ selected: s.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`${s.road}, segment ${s.index} of ${s.of}`}
                    style={({ pressed }) => ({
                      minHeight: 60,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderTopWidth: i ? 1 : 0,
                      borderColor: c.divider,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 32,
                        borderRadius: 3,
                        backgroundColor: segmentLengthColor(s.lengthMi),
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <T
                        size={14}
                        style={{ fontFamily: fonts.bold }}
                        numberOfLines={1}
                      >
                        {s.road}
                      </T>
                      <T muted size={12}>
                        Segment {s.index} of {s.of} · {wardLabel(s)} ·{" "}
                        {s.lengthMi.toFixed(2)} mi
                      </T>
                    </View>
                    <ChevronRight size={18} color={c.muted} />
                  </Pressable>
                ))}
              </View>
              {matching.length > 20 && (
                <T muted size={12} style={{ textAlign: "center" }}>
                  Showing 20 of {matching.length.toLocaleString()}. Search to
                  narrow the list.
                </T>
              )}
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
          )
        ) : sheet === "filters" ? (
          <>
            <SectionLabel>Ward</SectionLabel>
            <WardPicker />
            <SectionLabel>Show only</SectionLabel>
            <View
              style={{
                backgroundColor: c.dataSurface,
                borderRadius: 22,
                paddingHorizontal: 16,
              }}
            >
              {filters.map((f, i) => (
                <Row
                  key={f.label}
                  style={{
                    minHeight: 54,
                    borderTopWidth: i ? 1 : 0,
                    borderColor: c.divider,
                  }}
                >
                  <T size={14}>
                    {f.label === "Selected ward"
                      ? `Ward ${state.ward} only`
                      : f.label}
                  </T>
                  <Toggle
                    accessibilityLabel={f.label}
                    value={f.value}
                    onValueChange={f.set}
                  />
                </Row>
              ))}
            </View>
            <Row style={{ gap: 10 }}>
              <Button
                outline
                label="Clear all"
                disabled={!activeFilters.length}
                onPress={() => filters.forEach((f) => f.set(false))}
                style={{ flex: 1 }}
              />
              <Button
                label="Show results"
                onPress={() => setSheet("")}
                style={{ flex: 1 }}
              />
            </Row>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => navigateAfterClose(() => router.push("/import"))}
              accessibilityRole="button"
              accessibilityLabel="Add new data"
              style={({ pressed }) => ({
                alignItems: "center",
                gap: 6,
                paddingVertical: 20,
                borderRadius: 22,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: c.border,
                backgroundColor: c.dataSurface,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: c.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Upload size={20} color={c.ink} />
              </View>
              <T size={14} style={{ fontFamily: fonts.bold }}>
                Add data files
              </T>
              <T muted size={12}>
                Results CSV from the Excel tool, or map GeoJSON
              </T>
            </Pressable>
            <SectionLabel>Source files</SectionLabel>
            {state.files.length ? (
              <View>
                {state.files.map((f, i) => (
                  <Row
                    key={`${f.source ?? "uploaded"}:${f.name}`}
                    style={{
                      minHeight: 64,
                      gap: 12,
                      borderTopWidth: i ? 1 : 0,
                      borderColor: c.divider,
                    }}
                  >
                    <FileBadge label={f.type} />
                    <View style={{ flex: 1 }}>
                      <T size={13} style={{ fontFamily: fonts.bold }}>
                        {fileDisplayName(f)}
                      </T>
                      <T muted size={11}>
                        {f.summary}
                      </T>
                    </View>
                    <Toggle
                      accessibilityLabel={`Show ${fileDisplayName(f)} source file`}
                      value={f.visible}
                      onValueChange={(visible) =>
                        state.set({
                          files: state.files.map((x) =>
                            x === f ? { ...x, visible } : x,
                          ),
                        })
                      }
                    />
                  </Row>
                ))}
              </View>
            ) : (
              <T muted>No files loaded yet.</T>
            )}
          </>
        )}
      </Sheet>
    </View>
  );
}

function RoundButton({
  icon: Icon,
  label,
  onPress,
  badge = 0,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  badge?: number;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} active` : label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.surface,
        boxShadow: c.floatShadow,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icon size={20} color={c.ink} />
      {badge > 0 && (
        <View
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.primary,
          }}
        >
          <T size={10} style={{ fontFamily: fonts.bold, color: c.onPrimary }}>
            {badge}
          </T>
        </View>
      )}
    </Pressable>
  );
}

function StackButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 46,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? c.dataSurface : "transparent",
      })}
    >
      <Icon size={19} color={c.ink} />
    </Pressable>
  );
}

function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={`Remove ${label} filter`}
      style={{
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingLeft: 14,
        paddingRight: 10,
        borderRadius: 999,
        backgroundColor: c.primary,
        boxShadow: c.floatShadow,
      }}
    >
      <T size={12} style={{ fontFamily: fonts.bold, color: c.onPrimary }}>
        {label}
      </T>
      <X size={14} color={c.onPrimary} />
    </Pressable>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  const c = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.dataSurface,
        borderRadius: 18,
        padding: 12,
        gap: 2,
      }}
    >
      <T heading size={22} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </T>
      <T muted size={11}>
        {label}
      </T>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <T heading size={17}>
      {children}
    </T>
  );
}

function WardSwatches() {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 2 }}>
        {c.wardFills.map((fill, index) => (
          <View
            key={fill}
            style={{
              width: 4,
              height: 12,
              backgroundColor: fill,
              borderWidth: 0.5,
              borderColor: c.wardStrokes[index],
              borderRadius: 2,
              opacity: c.wardFillOpacity,
            }}
          />
        ))}
      </View>
      <T muted size={11}>
        Wards
      </T>
    </View>
  );
}
