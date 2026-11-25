import { useMemo } from "react";
import { View } from "react-native";
import { type MapLayer, mapLayerInfo } from "../analysis/mapLayers";
import {
  combinedTierLabels,
  rankedRows,
  valueRange,
} from "../analysis/mapViews";
import type { SegmentResult } from "../analysis/types";
import { useFlow } from "../store/useFlow";
import { format, useTheme } from "../theme";
import { SegmentLengthLegend } from "./SegmentLengthLegend";
import { T } from "./ui";

/** One compact legend line per visible data layer, front to back. */
export function MapLegend({
  layers,
  segments,
  scopeWard,
  crashCount,
}: {
  layers: readonly MapLayer[];
  segments: SegmentResult[];
  scopeWard?: number;
  crashCount: number;
}) {
  const c = useTheme();
  const results = useFlow((s) => s.results);
  const ranges = useMemo(() => {
    const visible = new Set(segments.map((s) => s.id));
    const range = (kind: "vc" | "collisions") =>
      valueRange(
        rankedRows(results, kind, scopeWard).filter((r) => visible.has(r.id)),
      );
    return { vc: range("vc"), collisions: range("collisions") };
  }, [results, segments, scopeWard]);
  if (!layers.length)
    return (
      <T muted size={12}>
        No data layers shown. Open Data layers to turn some on.
      </T>
    );
  return (
    <View style={{ gap: 8 }}>
      {layers.map((layer) => (
        <View key={layer} style={{ gap: 4 }}>
          <T muted size={11}>
            {mapLayerInfo[layer].label}
            {scopeWard !== undefined &&
            (layer === "combined" || layer === "vc" || layer === "collisions")
              ? ` · Ward ${scopeWard}`
              : ""}
          </T>
          {layer === "segments" && <SegmentLengthLegend />}
          {layer === "wards" && <WardSwatches focus={scopeWard} />}
          {layer === "combined" && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {combinedTierLabels.map((label, tier) => (
                <Swatch
                  key={label}
                  color={c.combinedTiers[tier]}
                  height={[6, 5, 4, 3][tier]}
                  label={label}
                />
              ))}
            </View>
          )}
          {(layer === "vc" || layer === "collisions") && (
            <Scale
              colors={layer === "vc" ? c.vcScale : c.collisionScale}
              min={
                ranges[layer]
                  ? layer === "vc"
                    ? ranges[layer].min.toFixed(2)
                    : format(ranges[layer].min)
                  : "N/A"
              }
              max={
                ranges[layer]
                  ? layer === "vc"
                    ? ranges[layer].max.toFixed(2)
                    : format(ranges[layer].max)
                  : "N/A"
              }
              note={layer === "vc" ? "Outlined: over capacity" : undefined}
            />
          )}
          {layer === "hotspots" && (
            <Scale
              colors={c.crashHeatColors}
              min="Lower"
              max="Higher"
              note={`${format(crashCount)} crashes`}
            />
          )}
        </View>
      ))}
    </View>
  );
}

function Scale({
  colors,
  min,
  max,
  note,
}: {
  colors: readonly string[];
  min: string;
  max: string;
  note?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <T muted size={11}>
        {min}
      </T>
      <View
        style={{
          flex: 1,
          maxWidth: 140,
          flexDirection: "row",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {colors.map((color) => (
          <View key={color} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </View>
      <T muted size={11}>
        {max}
      </T>
      {note && (
        <T muted size={11} numberOfLines={1} style={{ flexShrink: 1 }}>
          · {note}
        </T>
      )}
    </View>
  );
}

function Swatch({
  color,
  label,
  height,
}: {
  color: string;
  label: string;
  height: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View
        style={{
          width: 16,
          height,
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
      <T muted size={11}>
        {label}
      </T>
    </View>
  );
}

function WardSwatches({ focus }: { focus?: number }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 2 }}>
        {c.wardFills.map((fill, index) => (
          <View
            key={fill}
            style={{
              width: 6,
              height: 12,
              backgroundColor: fill,
              borderWidth: 0.5,
              borderColor: c.wardStrokes[index],
              borderRadius: 2,
              opacity:
                focus === undefined || focus === index + 1
                  ? c.wardFillOpacity
                  : c.wardFillOpacity * 0.3,
            }}
          />
        ))}
      </View>
      <T muted size={11}>
        {focus === undefined ? "Wards 1–8" : `Ward ${focus} in focus`}
      </T>
    </View>
  );
}
