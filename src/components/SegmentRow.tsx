import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { RankKind, SegmentResult } from "../analysis/types";
import { useFlow } from "../store/useFlow";
import { fonts, format, useTheme } from "../theme";
import { Button, Card, Row, T } from "./ui";
export function SegmentRow({
  segment: s,
  kind = "combined",
  compact = false,
  minimal = false,
  wardLabel,
}: {
  segment: SegmentResult;
  kind?: RankKind;
  compact?: boolean;
  minimal?: boolean;
  wardLabel?: number;
}) {
  const [expanded, setExpanded] = useState(false),
    c = useTheme();
  const rank =
    kind === "combined"
      ? s.combinedRank
      : kind === "vc"
        ? s.vcRank
        : s.collisionRank;
  return (
    <Card
      style={{
        padding: minimal ? 16 : 14,
        gap: 10,
        ...(minimal
          ? {
              borderRadius: 18,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.background,
            }
          : {}),
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${s.road}, segment ${s.index}, rank ${rank}. ${expanded ? "Collapse" : "Expand"} details`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Row>
          <View
            style={{
              width: minimal ? 32 : 38,
              height: minimal ? 32 : 38,
              borderRadius: minimal ? 16 : 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: (rank ?? 99) <= 3 ? c.primary : c.primaryTint,
            }}
          >
            <T
              heading
              size={19}
              style={{ color: (rank ?? 99) <= 3 ? c.onPrimary : c.primaryDeep }}
            >
              {format(rank)}
            </T>
          </View>
          <View style={{ flex: 1 }}>
            <T size={minimal ? 14 : 15} style={{ fontFamily: fonts.bold }}>
              {s.road}{" "}
              <T muted size={12}>
                · {s.lengthMi.toFixed(2)} mi
              </T>
            </T>
            <T muted size={12}>
              {s.from && s.to
                ? `${s.from} → ${s.to}`
                : `Segment ${s.index} of ${s.of}`}
              {wardLabel ? ` · Ward ${wardLabel}` : ""}
            </T>
          </View>
          {!compact && (
            <View style={{ alignItems: "flex-end" }}>
              <T heading size={18}>
                {kind === "combined"
                  ? format(s.combinedScore)
                  : kind === "vc"
                    ? format(s.vc, 2)
                    : format(s.collisions)}
              </T>
              <T muted size={10}>
                {kind === "combined"
                  ? "score"
                  : kind === "vc"
                    ? "V/C"
                    : "crashes"}
              </T>
            </View>
          )}
        </Row>
      </Pressable>
      {compact && (
        <View style={{ paddingLeft: 50, gap: 5 }}>
          <Row
            style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: 6 }}
          >
            <Tag label={`V/C rank ${format(s.vcRank)}`} />
            <Tag label={`Collision rank ${format(s.collisionRank)}`} />
          </Row>
          <Tag blue label={`Score ${format(s.combinedScore)}`} />
        </View>
      )}
      {expanded && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              ["V/C rank", `${format(s.vcRank)} · ratio ${format(s.vc, 2)}`],
              [
                "Collision rank",
                `${format(s.collisionRank)} · ${format(s.collisions)} crashes`,
              ],
              [
                "Highest traffic count",
                `${format(s.maxVolume)} (${s.volumeYear ?? "—"})`,
              ],
              [
                "LOS E capacity",
                `${format(s.capacity)} · ${format(s.lanes)} lanes`,
              ],
            ].map(([label, value]) => (
              <View
                key={label}
                style={{
                  width: "48%",
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: c.background,
                }}
              >
                <T muted size={11}>
                  {label}
                </T>
                <T size={12} style={{ fontFamily: fonts.bold }}>
                  {value}
                </T>
              </View>
            ))}
          </View>
          <T muted size={11}>
            Start {s.start.join(", ")} · End {s.end.join(", ")} ·{" "}
            {s.lengthMi.toFixed(2)} mi
          </T>
          {s.flags.map((f) => (
            <T key={f} size={12} style={{ color: c.primaryText }}>
              {f}
            </T>
          ))}
          <Button
            label="Show on map"
            onPress={() => {
              useFlow.getState().set({ selected: s.id });
              router.push("/search");
            }}
          />
        </>
      )}
    </Card>
  );
}
function Tag({ label, blue = false }: { label: string; blue?: boolean }) {
  const c = useTheme();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 7,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: blue ? c.blueTint : c.chipTint,
      }}
    >
      <T size={11} style={{ color: c.primaryDeep }}>
        {label}
      </T>
    </View>
  );
}
