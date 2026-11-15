import { useEffect, useState } from "react";
import { Modal, View, useWindowDimensions } from "react-native";
import { Button, Card, Row, T } from "./ui";
import { useFlow } from "../store/useFlow";
import { useTheme } from "../theme";
type Bounds = { x: number; y: number; width: number; height: number };
export function CoachTour({
  measure,
}: {
  measure: (step: number, callback: (bounds: Bounds) => void) => () => void;
}) {
  const step = useFlow((s) => s.tour),
    set = useFlow((s) => s.set),
    c = useTheme(),
    { height, width } = useWindowDimensions(),
    [bounds, setBounds] = useState<Bounds | null>(null);
  useEffect(() => {
    if (step === null) return;
    return measure(step, setBounds);
  }, [step, measure]);
  if (step === null || !bounds) return null;
  const top = Math.max(0, bounds.y),
    bottom = Math.min(height, top + bounds.height),
    left = Math.max(0, bounds.x),
    right = Math.min(width, left + bounds.width);
  const calloutWidth = Math.min(width - 32, 350),
    calloutLeft = Math.max(16, Math.min(left, width - calloutWidth - 16));
  const calloutTop =
    bottom + 230 < height ? bottom + 12 : Math.max(16, top - 230);
  const shade = "rgba(24,12,20,0.68)";
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={() => set({ tour: null })}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: top,
            backgroundColor: shade,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: bottom,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: shade,
          }}
        />
        <View
          style={{
            position: "absolute",
            top,
            left: 0,
            width: left,
            height: bottom - top,
            backgroundColor: shade,
          }}
        />
        <View
          style={{
            position: "absolute",
            top,
            left: right,
            right: 0,
            height: bottom - top,
            backgroundColor: shade,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: top - 3,
            left: left - 3,
            width: bounds.width + 6,
            height: bottom - top + 6,
            borderWidth: 3,
            borderColor: c.border,
            borderRadius: 18,
          }}
        />
        <Card
          style={{
            position: "absolute",
            top: calloutTop,
            left: calloutLeft,
            width: calloutWidth,
            gap: 12,
          }}
        >
          <T heading size={20}>
            {
              [
                "Choose your ward",
                "Look inside a ranking",
                "Keep your analysis up to date",
              ][step]
            }
          </T>
          <T muted size={13}>
            {
              [
                "Pick any of Norman’s eight wards. Home and Rankings share the same selection.",
                "Tap a segment to see its V/C ratio, collision count and combined score. No results are invented while files are pending.",
                "Upload raw files, review the preview, then confirm to re-rank. You can undo the previous run from Menu.",
              ][step]
            }
          </T>
          <Row>
            <T muted size={12}>
              {step + 1} of 3
            </T>
            <Button
              label={step === 2 ? "Finish tour" : "Next"}
              onPress={() => set({ tour: step === 2 ? null : step + 1 })}
            />
          </Row>
          <Button
            label="End tour"
            outline
            onPress={() => set({ tour: null })}
          />
        </Card>
      </View>
    </Modal>
  );
}
