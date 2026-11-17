import { type RefObject, useCallback } from "react";
import type { LayoutChangeEvent, ScrollView, View } from "react-native";

type TargetView = React.ComponentRef<typeof View>;
type ScrollRef = RefObject<React.ComponentRef<typeof ScrollView> | null>;

// Screens register the views the coach-mark tour highlights. The tour lives in
// the tab layout, so it can switch tabs and then find each target here.
export type TourTargetId =
  | "home-map"
  | "home-data"
  | "ranks-wards"
  | "ranks-first"
  | "chat-input"
  | "menu-data";

type Target = {
  view: TargetView | null;
  /** Offset within the screen's scroll content (targets are direct children). */
  y: number;
  scroll?: ScrollRef;
};
const targets = new Map<TourTargetId, Target>();

export function useTourTarget(id: TourTargetId, scroll?: ScrollRef) {
  const ref = useCallback(
    (view: TargetView | null) => {
      targets.set(id, { y: 0, ...targets.get(id), view, scroll });
    },
    [id, scroll],
  );
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      targets.set(id, {
        view: null,
        ...targets.get(id),
        y: e.nativeEvent.layout.y,
      });
    },
    [id],
  );
  return { ref, onLayout };
}

export function getTourTarget(id: TourTargetId) {
  return targets.get(id);
}
