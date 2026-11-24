import { type RefObject, useCallback } from "react";
import type { LayoutChangeEvent, ScrollView, View } from "react-native";

type TargetView = React.ComponentRef<typeof View>;
type ScrollRef = RefObject<React.ComponentRef<typeof ScrollView> | null>;

// Screens register the views the coach-mark tour highlights. The tour lives in
// the root layout, so it can follow the tour between tabs and other routes.
export type TourTargetId =
  | "home-map"
  | "home-data"
  | "data-source"
  | "ranks-metrics"
  | "ranks-sort"
  | "ranks-export"
  | "ranks-wards"
  | "ranks-first"
  | "chat-input"
  | "menu-data"
  | "menu-appearance"
  | "map-search"
  | "map-modes"
  | "map-summary"
  | "map-tools"
  | "import-files"
  | "diagnostics-review";

type Target = {
  view: TargetView | null;
  /** Fallback offset if the scroll content cannot be measured. */
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
  return { ref, onLayout, collapsable: false as const };
}

export function getTourTarget(id: TourTargetId) {
  return targets.get(id);
}
