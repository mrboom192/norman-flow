import { ChevronDown, MapPin } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { topSegmentMarkers } from "../analysis/crashMap";
import {
  combinedTierLabels,
  describeRanked,
  type MapMetric,
  mapMetrics,
  rankedRows,
  valueRange,
} from "../analysis/mapViews";
import type { SegmentResult } from "../analysis/types";
import { useFlow } from "../store/useFlow";
import { fonts, format, useTheme } from "../theme";
import { HeatLegend } from "./HeatLegend";
import { Row, T, Toggle } from "./ui";

/** Heat-mode controls: metric, citywide/ward scope, legends and ranked lists. */
export function HeatPanel({
  metric,
  onMetric,
  scopeWard,
  onScopeWard,
  crashYear,
  onCrashYear,
  segments,
  crashCount,
  hotspotYears,
  onSelect,
}: {
  metric: MapMetric;
  onMetric: (metric: MapMetric) => void;
  scopeWard?: number;
  onScopeWard: (ward?: number) => void;
  crashYear?: number;
  onCrashYear: (year?: number) => void;
  segments: SegmentResult[];
  crashCount: number;
  /** Years present in the hotspot layer, oldest first. */
  hotspotYears: number[];
  onSelect: (id: string) => void;
}) {
  const c = useTheme(),
    state = useFlow();
  const [showTopTen, setShowTopTen] = useState(false);
  const visible = useMemo(() => new Set(segments.map((s) => s.id)), [segments]);
  const rows = useMemo(
    () =>
      metric === "crashes"
        ? []
        : rankedRows(state.results, metric, scopeWard).filter((r) =>
            visible.has(r.id),
          ),
    [metric, scopeWard, state.results, visible],
  );
  const range = valueRange(rows);
  const topTen = useMemo(
    () =>
      metric === "crashes"
        ? topSegmentMarkers(state.files, state.results?.segments ?? [])
        : [],
    [metric, state.files, state.results],
  );
  const years = hotspotYears.length
    ? `${hotspotYears[0]}–${hotspotYears[hotspotYears.length - 1]}`
    : "";

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          padding: 3,
          borderRadius: 999,
          backgroundColor: c.dataSurface,
        }}
      >
        {mapMetrics.map(({ key, label }) => {
          const active = metric === key;
          return (
            <Pressable
              key={key}
              onPress={() => onMetric(key)}
              accessibilityRole="button"
              accessibilityLabel={`${label} map`}
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: active ? c.surface : "transparent",
                boxShadow: active
                  ? "0px 1px 4px rgba(0, 0, 0, 0.12)"
                  : undefined,
              }}
            >
              <T
                size={12}
                numberOfLines={1}
                style={{
                  fontFamily: fonts.bold,
                  color: active ? c.ink : c.muted,
                }}
              >
                {label}
              </T>
            </Pressable>
          );
        })}
      </View>

      {metric === "crashes" ? (
        <>
          <Pills
            label="Crash year"
            options={[
              { label: "All years", value: undefined },
              ...hotspotYears.map((y) => ({ label: String(y), value: y })),
            ]}
            value={crashYear}
            onChange={onCrashYear}
          />
          <Row style={{ minHeight: 44, gap: 10 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: state.crashPointsVisible
                  ? c.crashMarker
                  : c.dataSurface,
              }}
            >
              <MapPin
                size={16}
                color={state.crashPointsVisible ? c.white : c.muted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <T size={13} style={{ fontFamily: fonts.bold }}>
                Crash locations
              </T>
              <T muted size={11}>
                Dots and count badges · zoom in to separate
              </T>
            </View>
            <Toggle
              accessibilityLabel="Show crash locations"
              value={state.crashPointsVisible}
              onValueChange={(crashPointsVisible) =>
                state.set({ crashPointsVisible })
              }
            />
          </Row>
          <HeatLegend
            segments={segments}
            metric="collisions"
            crashCount={crashCount}
          />
          {!!years && (
            <T muted size={11}>
              Hotspot layer: {years} data
            </T>
          )}
          {topTen.length > 0 && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showTopTen }}
                onPress={() => setShowTopTen(!showTopTen)}
                style={{
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <T size={13} style={{ fontFamily: fonts.bold }}>
                  Top 10 crash segments (numbered markers)
                </T>
                <ChevronDown
                  size={16}
                  color={c.muted}
                  style={{
                    transform: [{ rotate: showTopTen ? "180deg" : "0deg" }],
                  }}
                />
              </Pressable>
              {showTopTen && (
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {topTen.map((m) => (
                    <ListLine
                      key={m.id}
                      onPress={() => onSelect(m.id)}
                      text={`${m.rank} ${m.road}: ${m.from && m.to ? `${m.from} to ${m.to}` : m.id} · ${format(m.collisions)} crashes`}
                    />
                  ))}
                </ScrollView>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <Pills
            label="Map scope"
            options={[
              { label: "Citywide", value: undefined },
              ...[1, 2, 3, 4, 5, 6, 7, 8].map((w) => ({
                label: `Ward ${w}`,
                value: w,
              })),
            ]}
            value={scopeWard}
            onChange={onScopeWard}
          />
          {metric === "combined" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {combinedTierLabels.map((label, tier) => (
                <Swatch
                  key={label}
                  color={c.combinedTiers[tier]}
                  height={[6, 5, 4, 3][tier]}
                  label={label}
                />
              ))}
              <Swatch color={c.unrankedRoad} height={2} label="Not ranked" />
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: "row",
                  height: 8,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                {(metric === "vc" ? c.vcScale : c.collisionScale).map(
                  (color) => (
                    <View
                      key={color}
                      style={{ flex: 1, backgroundColor: color }}
                    />
                  ),
                )}
              </View>
              <Row>
                <T muted size={11}>
                  {range
                    ? metric === "vc"
                      ? range.min.toFixed(2)
                      : format(range.min)
                    : "N/A"}
                </T>
                <T muted size={11}>
                  {metric === "vc" ? "V/C ratio" : "Collisions"}
                </T>
                <T muted size={11}>
                  {range
                    ? metric === "vc"
                      ? range.max.toFixed(2)
                      : format(range.max)
                    : "N/A"}
                </T>
              </Row>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {metric === "vc" && (
                  <Swatch
                    color={c.vcScale[c.vcScale.length - 1]}
                    outline={c.ink}
                    height={5}
                    label="Over capacity (V/C ≥ 1.0)"
                  />
                )}
                <Swatch color={c.unrankedRoad} height={2} label="Not ranked" />
              </View>
            </View>
          )}
          {scopeWard !== undefined && (
            <View>
              <T size={12} style={{ fontFamily: fonts.bold, marginBottom: 2 }}>
                Top 5 in Ward {scopeWard}
              </T>
              {rows.length ? (
                <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
                  {rows.slice(0, 5).map((r) => (
                    <ListLine
                      key={r.id}
                      onPress={() => onSelect(r.id)}
                      text={describeRanked(r)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <T muted size={11}>
                  No ranked segments in this ward match the current filters.
                </T>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function Pills<V>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: V }[];
  value: V;
  onChange: (value: V) => void;
}) {
  const c = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={label}
      contentContainerStyle={{ gap: 6 }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              minHeight: 36,
              paddingHorizontal: 12,
              borderRadius: 999,
              justifyContent: "center",
              backgroundColor: active ? c.primary : c.dataSurface,
            }}
          >
            <T
              size={12}
              style={{
                fontFamily: fonts.bold,
                color: active ? c.onPrimary : c.muted,
              }}
            >
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Swatch({
  color,
  label,
  height,
  outline,
}: {
  color: string;
  label: string;
  height: number;
  outline?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View
        style={{
          width: 16,
          height,
          borderRadius: height / 2,
          backgroundColor: color,
          borderWidth: outline ? 1.5 : 0,
          borderColor: outline,
        }}
      />
      <T muted size={11}>
        {label}
      </T>
    </View>
  );
}

function ListLine({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <T size={12} numberOfLines={1}>
        {text}
      </T>
    </Pressable>
  );
}
