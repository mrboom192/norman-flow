import { View } from "react-native";
import { heatColor, heatRange, type HeatMetric } from "../analysis/heatmap";
import type { SegmentResult } from "../analysis/types";
import { format, useTheme } from "../theme";
import { T } from "./ui";

export function HeatLegend({
  segments,
  metric,
  crashCount,
}: {
  segments: SegmentResult[];
  metric: HeatMetric;
  crashCount: number;
}) {
  const c = useTheme();
  const range = heatRange(segments, metric);
  if (metric === "collisions")
    return (
      <View style={{ gap: 6, marginTop: 8 }}>
        <View
          style={{
            flexDirection: "row",
            height: 8,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 25 }, (_, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                backgroundColor: heatColor(
                  index,
                  { min: 0, max: 24 },
                  c.crashHeatColors,
                  c.muted,
                ),
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T muted size={11}>
            Lower density
          </T>
          <T muted size={11}>
            Higher density
          </T>
        </View>
        <T muted size={11}>
          {format(crashCount)} crash locations · Equal weight · ~200 m radius
        </T>
        <T muted size={11}>
          Numbered markers: published city combined ranks 1–10
        </T>
        {!crashCount && (
          <T muted size={11}>
            No crash points visible. Check filters and the Crash locations
            layer.
          </T>
        )}
      </View>
    );
  if (!range)
    return (
      <T size={11} muted>
        No computed values for these segments.
      </T>
    );
  const label = (value: number) =>
    metric === "vc" ? format(value, 2) : format(value);
  return (
    <View style={{ gap: 6, marginTop: 8 }}>
      <View
        style={{
          flexDirection: "row",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 25 }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              backgroundColor: heatColor(
                range.min + ((range.max - range.min) * index) / 24,
                range,
                c.heatColors,
                c.muted,
              ),
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T size={11} muted>
          Min {label(range.min)}
        </T>
        <T size={11} muted>
          Max {label(range.max)}
        </T>
      </View>
      <T size={11} muted>
        Visible segments · {metric === "vc" ? "V/C ratio" : "Collisions"} ·
        Gray: uncomputed
      </T>
    </View>
  );
}
