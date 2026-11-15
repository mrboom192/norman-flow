import { useState } from "react";
import { View, ScrollView, Switch, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  SlidersHorizontal,
  Layers,
  RotateCcw,
  Plus,
  Minus,
  X,
} from "lucide-react-native";
import { RoadMap } from "../../components/RoadMap";
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
} from "../../components/ui";
import { Sheet } from "../../components/Sheet";
import { useFlow } from "../../store/useFlow";
import { format, fonts, useTheme } from "../../theme";
export default function SearchScreen() {
  const c = useTheme(),
    state = useFlow(),
    params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? ""),
    [mode, setMode] = useState("Map"),
    [sheet, setSheet] = useState(""),
    [zoom, setZoom] = useState(1),
    [wardFilter, setWardFilter] = useState(false),
    [lanes, setLanes] = useState(false),
    [crashes, setCrashes] = useState(false),
    [counts, setCounts] = useState(false),
    [metric, setMetric] = useState<"vc" | "collisions">("vc");
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
  const visibleSources = new Set(
    state.files.filter((f) => f.visible).map((f) => f.name),
  );
  const matching =
    state.results?.segments.filter(
      (s) =>
        visibleSources.has(s.source) &&
        (!wardFilter || s.wards.includes(state.ward)) &&
        (!lanes || (s.lanes ?? 0) >= 4) &&
        (!crashes || s.collisions > 0) &&
        (!counts || s.maxVolume !== undefined) &&
        (!query ||
          s.road.toLowerCase().includes(query.toLowerCase()) ||
          (/^ward\s*[1-8]$/i.test(query) &&
            s.wards.includes(Number(query.match(/[1-8]/)?.[0])))),
    ) ?? [];
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flex: 1, minHeight: 220 }}>
        <RoadMap segments={matching} zoom={zoom} mode={mode} metric={metric} />
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 16,
            gap: 10,
          }}
        >
          <Row>
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
            )}{" "}
            {lanes && (
              <Chip label="4+ lanes ×" onPress={() => setLanes(false)} />
            )}{" "}
            {crashes && (
              <Chip
                label="Has collisions ×"
                onPress={() => setCrashes(false)}
              />
            )}{" "}
            {counts && (
              <Chip
                label="Has traffic count ×"
                onPress={() => setCounts(false)}
              />
            )}
          </View>
          <Row style={{ alignItems: "flex-start" }}>
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
              {["Map", "Satellite", "Heat"].map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: m === mode }}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 12,
                    justifyContent: "center",
                    borderRadius: 10,
                    backgroundColor: m === mode ? c.primary : "transparent",
                  }}
                >
                  <T
                    size={13}
                    style={{
                      fontFamily: fonts.bold,
                      color: m === mode ? c.white : c.muted,
                    }}
                  >
                    {m}
                  </T>
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
                onPress={() => setZoom(Math.min(zoom * 1.4, 10))}
                style={{ borderRadius: 14 }}
              />
              <IconButton
                icon={Minus}
                label="Zoom out"
                onPress={() => setZoom(Math.max(zoom / 1.4, 0.5))}
                style={{ borderRadius: 14 }}
              />
            </View>
          </Row>
        </View>
        {mode === "Heat" && (
          <View
            style={{
              position: "absolute",
              bottom: 12,
              left: 16,
              padding: 10,
              borderRadius: 12,
              backgroundColor: c.surface,
            }}
          >
            <Row>
              <Chip
                label="V/C"
                active={metric === "vc"}
                onPress={() => setMetric("vc")}
              />
              <Chip
                label="Collisions"
                active={metric === "collisions"}
                onPress={() => setMetric("collisions")}
              />
            </Row>
            <T size={11} muted>
              {metric === "vc"
                ? "Blue: V/C < 1 · Orange: V/C ≥ 1"
                : "Blue: 0 · Orange: 1+ collisions"}{" "}
              · — uncomputed
            </T>
          </View>
        )}
      </View>
      <View
        style={{
          maxHeight: "48%",
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          backgroundColor: c.surface,
          padding: 20,
          gap: 10,
        }}
      >
        <View
          style={{
            height: 4,
            width: 40,
            borderRadius: 4,
            backgroundColor: c.border,
            alignSelf: "center",
          }}
        />
        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
          {selected ? (
            <>
              <Row>
                <View style={{ flex: 1 }}>
                  <T heading size={23}>
                    {selected.road}
                  </T>
                  <T muted size={12}>
                    Segment {selected.index} of {selected.of} · Ward{" "}
                    {selected.wardMajority || "—"}
                  </T>
                </View>
                <IconButton
                  icon={X}
                  label="Close segment"
                  onPress={() => state.set({ selected: null })}
                />
              </Row>
              <Button
                label="See its rank"
                onPress={() => {
                  if (selected.wards.length)
                    state.set({ ward: selected.wards[0] });
                  router.push("/ranks");
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
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {[
                  ["Segment length", `${selected.lengthMi.toFixed(2)} mi`],
                  [
                    "Total street length",
                    `${selected.roadTotalMi.toFixed(2)} mi`,
                  ],
                  [
                    "Lanes (GIS)",
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
              {selected.laneCoverage < 100 && (
                <View
                  style={{
                    backgroundColor: c.chipTint,
                    padding: 10,
                    borderRadius: 12,
                  }}
                >
                  <T size={12} style={{ color: c.primaryDeep }}>
                    Lane count only mapped for {selected.laneCoverage}% of this
                    segment — check the aerial view.
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
              action={() => router.push("/import")}
            />
          )}
        </ScrollView>
      </View>
      <Sheet
        title={sheet === "filters" ? "Filter the map" : "Files on this map"}
        visible={!!sheet}
        onClose={() => setSheet("")}
      >
        {sheet === "filters" ? (
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
              label="Upload CSV, XLSX, KML or KMZ"
              onPress={() => {
                setSheet("");
                router.push("/import");
              }}
            />
            {state.files.length ? (
              state.files.map((f) => (
                <Row key={f.name}>
                  <View style={{ flex: 1 }}>
                    <T size={13}>{f.name}</T>
                    <T muted size={11}>
                      {f.summary}
                    </T>
                  </View>
                  <Switch
                    accessibilityLabel={`Show ${f.name}`}
                    value={f.visible}
                    onValueChange={(visible) =>
                      state.set({
                        files: state.files.map((x) =>
                          x.name === f.name ? { ...x, visible } : x,
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
