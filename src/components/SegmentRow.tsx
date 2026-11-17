import { router } from "expo-router";
import { ChevronDown, MapPin, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { RankKind, SegmentResult } from "../analysis/types";
import { useFlow } from "../store/useFlow";
import { colors, fonts, format, useTheme } from "../theme";
import { Button, Row, T } from "./ui";

/** A ranked segment as a flush list row that expands to show its details. */
export function SegmentRow({
  segment: s,
  kind = "combined",
  divider = false,
}: {
  segment: SegmentResult;
  kind?: RankKind;
  divider?: boolean;
}) {
  const [expanded, setExpanded] = useState(false),
    c = useTheme();
  const rank =
    kind === "combined"
      ? s.combinedRank
      : kind === "vc"
        ? s.vcRank
        : s.collisionRank;
  const medal = rank && rank <= 3 ? c.medals[rank - 1] : undefined;
  const medalBorder = rank && rank <= 3 ? c.medalBorders[rank - 1] : undefined;
  const [value, unit] =
    kind === "combined"
      ? [format(s.combinedScore), "score"]
      : kind === "vc"
        ? [format(s.vc, 2), "V/C"]
        : [format(s.collisions), "crashes"];
  return (
    <View
      style={{
        borderTopWidth: divider ? 1 : 0,
        borderColor: c.divider,
        paddingBottom: expanded ? 14 : 0,
        gap: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Rank ${format(rank)}: ${s.road}, segment ${s.index}. ${value} ${unit}. ${expanded ? "Collapse" : "Expand"} details`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => ({
          minHeight: 68,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: medal ?? c.dataSurface,
            borderWidth: 1.5,
            borderColor: medalBorder ?? c.border,
          }}
        >
          <T heading size={17} style={{ color: medal ? colors.ink : c.ink }}>
            {format(rank)}
          </T>
        </View>
        <View style={{ flex: 1 }}>
          <T size={14} style={{ fontFamily: fonts.bold }} numberOfLines={1}>
            {s.road}
          </T>
          <T muted size={12} numberOfLines={1}>
            {s.from && s.to
              ? `${s.from} → ${s.to}`
              : `Segment ${s.index} of ${s.of}`}{" "}
            · {s.lengthMi.toFixed(2)} mi
          </T>
        </View>
        <View style={{ alignItems: "flex-end", minWidth: 44 }}>
          <T heading size={18}>
            {value}
          </T>
          <T muted size={10}>
            {unit}
          </T>
        </View>
        <ChevronDown
          size={18}
          color={c.muted}
          style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
        />
      </Pressable>
      {expanded && (
        <>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              backgroundColor: c.dataSurface,
              borderRadius: 18,
              padding: 6,
            }}
          >
            {[
              ["V/C rank", format(s.vcRank), `ratio ${format(s.vc, 2)}`],
              [
                "Collision rank",
                format(s.collisionRank),
                `${format(s.collisions)} crashes`,
              ],
              [
                "Highest traffic",
                format(s.maxVolume),
                s.volumeYear
                  ? `vehicles/day · ${s.volumeYear}`
                  : "vehicles/day",
              ],
              [
                "LOS E capacity",
                format(s.capacity),
                `${format(s.lanes)} lanes`,
              ],
            ].map(([label, main, sub]) => (
              <View key={label} style={{ width: "50%", padding: 10, gap: 1 }}>
                <T muted size={11}>
                  {label}
                </T>
                <T heading size={18}>
                  {main}
                </T>
                <T muted size={11}>
                  {sub}
                </T>
              </View>
            ))}
          </View>
          {s.flags.map((f) => (
            <Row
              key={f}
              style={{
                justifyContent: "flex-start",
                gap: 8,
                padding: 10,
                borderRadius: 14,
                backgroundColor: c.chipTint,
              }}
            >
              <TriangleAlert size={16} color={c.primaryDeep} />
              <T size={12} style={{ flex: 1, color: c.primaryDeep }}>
                {f}
              </T>
            </Row>
          ))}
          <T muted size={11}>
            Segment {s.index} of {s.of} · Start {s.start.join(", ")} · End{" "}
            {s.end.join(", ")}
          </T>
          <Button
            icon={MapPin}
            label="Show on map"
            onPress={() => {
              useFlow.getState().set({ selected: s.id });
              router.push("/search");
            }}
          />
        </>
      )}
    </View>
  );
}
