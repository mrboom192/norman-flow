import { Slider, Host } from "@expo/ui";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  GripVertical,
  MapPin,
  Upload,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  View,
  type ViewStyle,
} from "react-native";
import { topSegmentMarkers, visibleCrashPoints } from "../analysis/crashMap";
import {
  isRankLayer,
  layerHasWidth,
  layerStyleRange,
  type MapLayer,
  mapLayerInfo,
  moveMapLayer,
} from "../analysis/mapLayers";
import { describeRanked, rankedRows } from "../analysis/mapViews";
import type { SegmentResult } from "../analysis/types";
import { fileDisplayName } from "../services/displayNames";
import { useFlow, visibleGeometry } from "../store/useFlow";
import { fonts, format, useTheme } from "../theme";
import { LayerThumb } from "./MapThumbs";
import { FileBadge, Row, T, Toggle } from "./ui";

const reorderRow = 60;
type Drag = { index: number; offset: number; target: number };

/**
 * The map's Data layers page. Each layer card has a show/hide toggle and
 * opens to its options: opacity, line thickness, and the ward focus or
 * hotspot settings. Reorder switches to a compact list with up/down buttons
 * and drag handles; cards at the top draw in front.
 */
export function DataLayers({
  desktop,
  segments,
  onSelect,
  onAddFiles,
  onDragging,
}: {
  desktop: boolean;
  /** Roads matching the map's search and filters (defaults to all visible roads). */
  segments?: SegmentResult[];
  onSelect: (id: string) => void;
  onAddFiles: () => void;
  /** Lets the page lock its scrolling while a layer is being dragged. */
  onDragging?: (dragging: boolean) => void;
}) {
  const c = useTheme();
  const order = useFlow((s) => s.mapLayerOrder);
  const visible = useFlow((s) => s.mapLayersVisible);
  const scopeWard = useFlow((s) => s.mapScopeWard);
  const files = useFlow((s) => s.files);
  const results = useFlow((s) => s.results);
  const set = useFlow((s) => s.set);
  const [reordering, setReordering] = useState(false);
  const [open, setOpen] = useState<Partial<Record<MapLayer, boolean>>>({});
  const shownCount = order.filter((l) => visible[l]).length;
  const roads = useMemo(() => {
    if (segments) return segments;
    const ids = new Set(visibleGeometry(files).segments.map((s) => s.id));
    return results?.segments.filter((s) => ids.has(s.id)) ?? [];
  }, [segments, files, results]);
  const rankLayer = order.find((l) => visible[l] && isRankLayer(l));

  const status = (layer: MapLayer) =>
    layer === "wards" && scopeWard !== undefined
      ? `Ward ${scopeWard} in focus`
      : undefined;

  return (
    <View style={{ gap: 14 }}>
      <Row style={{ gap: 12, alignItems: "flex-start" }}>
        <T muted size={13} style={{ flex: 1 }}>
          {reordering
            ? "Layers at the top draw in front. Use the arrows, or drag a handle."
            : "Choose the data layers to show on the map. Open a layer for its options."}
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: reordering }}
          accessibilityLabel={reordering ? "Done reordering" : "Reorder layers"}
          onPress={() => setReordering(!reordering)}
          style={({ pressed }) => ({
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: reordering ? c.primary : c.dataSurface,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          {!reordering && <ArrowDownUp size={15} color={c.ink} />}
          <T
            size={13}
            style={{
              fontFamily: fonts.bold,
              color: reordering ? c.onPrimary : c.ink,
            }}
          >
            {reordering ? "Done" : "Reorder"}
          </T>
        </Pressable>
      </Row>
      {reordering ? (
        <ReorderList
          order={order}
          visible={visible}
          onChange={(mapLayerOrder) => set({ mapLayerOrder })}
          onDragging={onDragging}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {order.map((layer) => {
            const on = visible[layer];
            const info = mapLayerInfo[layer];
            const expanded = Boolean(open[layer]);
            const note = status(layer);
            return (
              <View
                key={layer}
                testID={`layer-card-${layer}`}
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: c.divider,
                  backgroundColor: c.surface,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityLabel={`${info.label} options`}
                    onPress={() => setOpen({ ...open, [layer]: !expanded })}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View style={{ opacity: on ? 1 : 0.55 }}>
                      <LayerThumb layer={layer} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Row style={{ justifyContent: "flex-start", gap: 4 }}>
                        <T size={14} style={{ fontFamily: fonts.bold }}>
                          {info.label}
                        </T>
                        <ChevronDown
                          size={15}
                          color={c.muted}
                          style={{
                            transform: [
                              { rotate: expanded ? "180deg" : "0deg" },
                            ],
                          }}
                        />
                      </Row>
                      <T muted size={12}>
                        {info.description}
                      </T>
                      {note && (
                        <T
                          size={11}
                          style={{
                            fontFamily: fonts.bold,
                            color: c.primaryText,
                          }}
                        >
                          {note}
                        </T>
                      )}
                    </View>
                  </Pressable>
                  <Toggle
                    accessibilityLabel={`Show ${info.label}`}
                    value={on}
                    onValueChange={(next) =>
                      set({ mapLayersVisible: { ...visible, [layer]: next } })
                    }
                  />
                </View>
                {expanded && (
                  <LayerSettings>
                    {!on && (
                      <T muted size={11}>
                        This layer is hidden. Turn it on to see these settings
                        on the map.
                      </T>
                    )}
                    <StyleSliders layer={layer} />
                    {layer === "wards" && (
                      <WardFocus
                        segments={roads}
                        rankLayer={rankLayer}
                        onSelect={onSelect}
                      />
                    )}
                    {layer === "hotspots" && (
                      <HotspotSettings onSelect={onSelect} />
                    )}
                  </LayerSettings>
                )}
              </View>
            );
          })}
        </View>
      )}
      <T muted size={12}>
        {shownCount
          ? `${shownCount} of ${order.length} layers shown`
          : "No layers shown. Turn one on to see it on the map."}
      </T>
      {!reordering && <SourceFiles onAddFiles={onAddFiles} />}
    </View>
  );
}

/** Compact rows for changing the draw order. */
function ReorderList({
  order,
  visible,
  onChange,
  onDragging,
}: {
  order: MapLayer[];
  visible: Record<MapLayer, boolean>;
  onChange: (order: MapLayer[]) => void;
  onDragging?: (dragging: boolean) => void;
}) {
  const c = useTheme();
  const [drag, setDrag] = useState<Drag | null>(null);
  const responders = useMemo(
    () =>
      order.map((_, index) => {
        const position = (dy: number): Drag => {
          const offset = Math.max(
            -index * reorderRow,
            Math.min((order.length - 1 - index) * reorderRow, dy),
          );
          return {
            index,
            offset,
            target: index + Math.round(offset / reorderRow),
          };
        };
        const end = () => {
          setDrag(null);
          onDragging?.(false);
        };
        return PanResponder.create({
          // Claim the touch before a parent scroll view can.
          onStartShouldSetPanResponderCapture: () => true,
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponderCapture: () => true,
          onPanResponderGrant: () => {
            onDragging?.(true);
            setDrag(position(0));
          },
          onPanResponderMove: (_, { dy }) => setDrag(position(dy)),
          onPanResponderRelease: (_, { dy }) => {
            end();
            const next = moveMapLayer(order, index, position(dy).target);
            if (next !== order) onChange(next);
          },
          onPanResponderTerminate: end,
          onPanResponderTerminationRequest: () => false,
        }).panHandlers;
      }),
    [order, onChange, onDragging],
  );
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.divider,
        borderRadius: 20,
        backgroundColor: c.surface,
        overflow: "hidden",
        // Dragging with a mouse shouldn't select the layer names.
        userSelect: "none",
      }}
    >
      {order.map((layer, index) => {
        const label = mapLayerInfo[layer].label;
        const lifted = drag?.index === index;
        let offset = 0;
        if (drag) {
          if (lifted) offset = drag.offset;
          else if (index > drag.index && index <= drag.target)
            offset = -reorderRow;
          else if (index < drag.index && index >= drag.target)
            offset = reorderRow;
        }
        return (
          <View
            key={layer}
            style={{
              height: reorderRow,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingLeft: 12,
              borderTopWidth: index && !lifted ? 1 : 0,
              borderColor: c.divider,
              borderRadius: lifted ? 16 : 0,
              backgroundColor: lifted ? c.primaryTint : c.surface,
              boxShadow: lifted ? c.floatShadow : undefined,
              zIndex: lifted ? 2 : 0,
              transform: [{ translateY: offset }],
            }}
          >
            <View style={{ opacity: visible[layer] ? 1 : 0.5 }}>
              <LayerThumb layer={layer} size={36} />
            </View>
            <T
              size={14}
              numberOfLines={1}
              style={{
                flex: 1,
                fontFamily: fonts.bold,
                color: visible[layer] ? c.ink : c.muted,
              }}
            >
              {label}
            </T>
            {[-1, 1].map((step) => {
              const target = index + step;
              const disabled = target < 0 || target >= order.length;
              const Icon = step === -1 ? ChevronUp : ChevronDown;
              return (
                <Pressable
                  key={step}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${label} ${step === -1 ? "up" : "down"}`}
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  onPress={() => onChange(moveMapLayer(order, index, target))}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 44,
                    borderRadius: 12,
                    opacity: disabled ? 0.25 : pressed ? 0.6 : 1,
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Icon size={19} color={c.ink} />
                </Pressable>
              );
            })}
            <View
              {...responders[index]}
              testID={`drag-layer-${layer}`}
              accessibilityLabel={`Drag ${label}`}
              style={[
                {
                  width: 44,
                  height: reorderRow,
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "grab",
                } as ViewStyle,
                // Keep the browser from scrolling the page from the handle.
                Platform.OS === "web"
                  ? ({ touchAction: "none" } as ViewStyle)
                  : null,
              ]}
            >
              <GripVertical size={18} color={c.muted} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Opacity and (for line layers) thickness, from @expo/ui sliders. */
function StyleSliders({ layer }: { layer: MapLayer }) {
  const styles = useFlow((s) => s.mapLayerStyles);
  const set = useFlow((s) => s.set);
  const look = styles[layer];
  const update = (patch: Partial<typeof look>) =>
    set({ mapLayerStyles: { ...styles, [layer]: { ...look, ...patch } } });
  return (
    <>
      <LabeledSlider
        label="Opacity"
        value={look.opacity}
        display={`${Math.round(look.opacity * 100)}%`}
        {...layerStyleRange.opacity}
        onChange={(opacity) => update({ opacity })}
      />
      {layerHasWidth(layer) && (
        <LabeledSlider
          label={layer === "wards" ? "Border thickness" : "Line thickness"}
          value={look.width}
          display={`${look.width.toFixed(2).replace(/\.?0+$/, "")}×`}
          {...layerStyleRange.width}
          onChange={(width) => update({ width })}
        />
      )}
    </>
  );
}

function LabeledSlider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Row>
        <T size={13} style={{ fontFamily: fonts.bold }}>
          {label}
        </T>
        <T muted size={12}>
          {display}
        </T>
      </Row>
      <Host
        matchContents={{ vertical: true }}
        seedColor={c.primary}
        style={{ width: "100%", minHeight: 36, justifyContent: "center" }}
      >
        <Slider
          value={value}
          min={min}
          max={max}
          step={step}
          onValueChange={(next) => onChange(Math.round(next / step) * step)}
        />
      </Host>
    </View>
  );
}

function LayerSettings({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  return (
    <View
      style={{
        gap: 10,
        marginHorizontal: 12,
        marginBottom: 12,
        padding: 12,
        borderRadius: 14,
        backgroundColor: c.dataSurface,
      }}
    >
      {children}
    </View>
  );
}

function WardFocus({
  segments,
  rankLayer,
  onSelect,
}: {
  segments: SegmentResult[];
  rankLayer?: MapLayer;
  onSelect: (id: string) => void;
}) {
  const results = useFlow((s) => s.results);
  const scopeWard = useFlow((s) => s.mapScopeWard);
  const set = useFlow((s) => s.set);
  const onScopeWard = (mapScopeWard?: number) => set({ mapScopeWard });
  const rows = useMemo(() => {
    if (scopeWard === undefined || !rankLayer || !isRankLayer(rankLayer))
      return [];
    const visible = new Set(segments.map((s) => s.id));
    return rankedRows(results, rankLayer, scopeWard)
      .filter((r) => visible.has(r.id))
      .slice(0, 5);
  }, [scopeWard, rankLayer, results, segments]);
  return (
    <>
      <View style={{ gap: 2 }}>
        <T size={13} style={{ fontFamily: fonts.bold }}>
          Ward focus
        </T>
        <T muted size={11}>
          A focused ward zooms in, fades the others and ranks roads within it.
        </T>
      </View>
      <Pills
        label="Ward focus"
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
      {scopeWard !== undefined && rankLayer && (
        <View>
          <T size={12} style={{ fontFamily: fonts.bold, marginBottom: 2 }}>
            Top 5 in Ward {scopeWard} · {mapLayerInfo[rankLayer].label}
          </T>
          {rows.length ? (
            rows.map((r) => (
              <ListLine
                key={r.id}
                onPress={() => onSelect(r.id)}
                text={describeRanked(r)}
              />
            ))
          ) : (
            <T muted size={11}>
              No ranked segments in this ward match the current filters.
            </T>
          )}
        </View>
      )}
    </>
  );
}

function HotspotSettings({ onSelect }: { onSelect: (id: string) => void }) {
  const c = useTheme();
  const files = useFlow((s) => s.files);
  const results = useFlow((s) => s.results);
  const dots = useFlow((s) => s.crashPointsVisible);
  const crashYear = useFlow((s) => s.mapCrashYear);
  const set = useFlow((s) => s.set);
  const onCrashYear = (mapCrashYear?: number) => set({ mapCrashYear });
  const hotspotYears = useMemo(
    () =>
      [
        ...new Set(
          visibleCrashPoints(files)
            .map((p) => p.year)
            .filter((y) => y > 0),
        ),
      ].sort((a, b) => a - b),
    [files],
  );
  const [showTopTen, setShowTopTen] = useState(false);
  const topTen = useMemo(
    () => topSegmentMarkers(files, results?.segments ?? []),
    [files, results],
  );
  return (
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
            backgroundColor: dots ? c.crashMarker : c.surface,
          }}
        >
          <MapPin size={16} color={dots ? c.white : c.muted} />
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
          value={dots}
          onValueChange={(crashPointsVisible) => set({ crashPointsVisible })}
        />
      </Row>
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
          {showTopTen &&
            topTen.map((m) => (
              <ListLine
                key={m.id}
                onPress={() => onSelect(m.id)}
                text={`${m.rank} ${m.road}: ${m.from && m.to ? `${m.from} to ${m.to}` : m.id} · ${format(m.collisions)} crashes`}
              />
            ))}
        </>
      )}
    </>
  );
}

function SourceFiles({ onAddFiles }: { onAddFiles: () => void }) {
  const c = useTheme();
  const files = useFlow((s) => s.files);
  const set = useFlow((s) => s.set);
  return (
    <View style={{ gap: 10 }}>
      <T heading size={17}>
        Source files
      </T>
      <T muted size={12}>
        Hide a file to take its roads, wards or crashes off the map. Rankings
        don’t change.
      </T>
      {files.length ? (
        <View>
          {files.map((f, i) => (
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
                  set({
                    files: files.map((x) => (x === f ? { ...x, visible } : x)),
                  })
                }
              />
            </Row>
          ))}
        </View>
      ) : (
        <T muted>No files loaded yet.</T>
      )}
      <Pressable
        onPress={onAddFiles}
        accessibilityRole="button"
        accessibilityLabel="Add new data"
        style={({ pressed }) => ({
          minHeight: 52,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderRadius: 999,
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderColor: c.border,
          backgroundColor: c.dataSurface,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Upload size={18} color={c.ink} />
        <T size={14} style={{ fontFamily: fonts.bold }}>
          Add data files
        </T>
      </Pressable>
    </View>
  );
}

export function Pills<V>({
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
              minHeight: 44,
              paddingHorizontal: 14,
              borderRadius: 999,
              justifyContent: "center",
              backgroundColor: active ? c.primary : c.surface,
              borderWidth: 1,
              borderColor: active ? c.primary : c.border,
            }}
          >
            <T
              size={12}
              style={{
                fontFamily: fonts.bold,
                color: active ? c.onPrimary : c.ink,
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
