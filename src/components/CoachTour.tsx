import { type Href, router } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, View, useWindowDimensions } from "react-native";
import { useFlow } from "../store/useFlow";
import { useTheme } from "../theme";
import { getTourTarget, type TourTargetId } from "./tourTargets";
import { Button, Card, Row, T } from "./ui";

type Bounds = { x: number; y: number; width: number; height: number };
const tourSteps: {
  route: Href;
  target: TourTargetId;
  title: string;
  body: string;
}[] = [
  {
    route: "/",
    target: "home-map",
    title: "Explore the map",
    body: "Open the full map to search roads, switch to Heat for V/C or crash density, and tap any road for its details.",
  },
  {
    route: "/",
    target: "home-data",
    title: "Explore your analysis data",
    body: "See what data is loaded and when it was last ranked. Tap a data tile for details, or review the analysis diagnostics.",
  },
  {
    route: "/ranks",
    target: "ranks-wards",
    title: "Choose a ward",
    body: "Pick one of Norman’s 8 wards, or All for citywide. Use the dropdowns to switch between Combined, V/C and Collisions, or change the sort.",
  },
  {
    route: "/ranks",
    target: "ranks-first",
    title: "Look inside a ranking",
    body: "Gold, silver and bronze mark the top three. Tap a segment to see its V/C ratio, collisions, traffic and capacity, or show it on the map.",
  },
  {
    route: "/chat",
    target: "chat-input",
    title: "Ask about the data",
    body: "Ask how the rankings work, where the data comes from, or what’s #1 in a ward. Answers come offline from this app.",
  },
  {
    route: "/menu",
    target: "menu-data",
    title: "Files and settings",
    body: "Use Add new data & re-rank to import results, preview changes, then confirm. Manage files and analysis settings, change the appearance, or replay this tour anytime.",
  },
];

/** Coach-mark tour across the tabs. Rendered once, in the tab layout. */
export function CoachTour() {
  const step = useFlow((s) => s.tour),
    set = useFlow((s) => s.set),
    c = useTheme(),
    { height, width } = useWindowDimensions(),
    // Keyed by step so a new step never shows the previous step's highlight.
    [found, setFound] = useState<{
      step: number;
      bounds: Bounds | null;
    } | null>(null);
  useEffect(() => {
    if (step === null) return;
    const { route, target } = tourSteps[step];
    router.navigate(route);
    let cancelled = false,
      tries = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const attempt = () => {
      if (cancelled) return;
      const t = getTourTarget(target);
      if (!t?.view) {
        // The tab may still be mounting; give up after ~2 s and show the card alone.
        if (++tries > 20) setFound({ step, bounds: null });
        else timers.push(setTimeout(attempt, 100));
        return;
      }
      t.scroll?.current?.scrollTo({
        y: Math.max(0, t.y - 100),
        animated: true,
      });
      timers.push(
        setTimeout(
          () =>
            t.view?.measureInWindow((x, y, w, h) => {
              if (!cancelled)
                setFound({
                  step,
                  bounds: w && h ? { x, y, width: w, height: h } : null,
                });
            }),
          400,
        ),
      );
    };
    timers.push(setTimeout(attempt, 150));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [step]);
  if (step === null || found?.step !== step) return null;
  const finish = () => {
    set({ tour: null });
    router.navigate("/");
  };
  const last = step === tourSteps.length - 1;
  const bounds = found.bounds;
  const shade = "rgba(24,12,20,0.68)";
  const calloutWidth = Math.min(width - 32, 350);
  let calloutTop = (height - 230) / 2,
    calloutLeft = (width - calloutWidth) / 2,
    hole: { top: number; bottom: number; left: number; right: number } | null =
      null;
  if (bounds) {
    const top = Math.max(0, bounds.y),
      bottom = Math.min(height, top + bounds.height),
      left = Math.max(0, bounds.x),
      right = Math.min(width, left + bounds.width);
    hole = { top, bottom, left, right };
    calloutLeft = Math.max(16, Math.min(left, width - calloutWidth - 16));
    calloutTop = bottom + 230 < height ? bottom + 12 : Math.max(16, top - 242);
  }
  return (
    <Modal transparent visible animationType="fade" onRequestClose={finish}>
      <View style={{ flex: 1 }}>
        {hole ? (
          <>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: hole.top,
                backgroundColor: shade,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: hole.bottom,
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: shade,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: hole.top,
                left: 0,
                width: hole.left,
                height: hole.bottom - hole.top,
                backgroundColor: shade,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: hole.top,
                left: hole.right,
                right: 0,
                height: hole.bottom - hole.top,
                backgroundColor: shade,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: hole.top - 4,
                left: hole.left - 4,
                width: hole.right - hole.left + 8,
                height: hole.bottom - hole.top + 8,
                borderWidth: 3,
                borderColor: c.primary,
                borderRadius: 20,
              }}
            />
          </>
        ) : (
          <View style={{ flex: 1, backgroundColor: shade }} />
        )}
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
            {tourSteps[step].title}
          </T>
          <T muted size={13}>
            {tourSteps[step].body}
          </T>
          <Row>
            <T muted size={12}>
              {step + 1} of {tourSteps.length}
            </T>
            <Row style={{ gap: 8 }}>
              {step > 0 && (
                <Button
                  outline
                  label="Back"
                  onPress={() => set({ tour: step - 1 })}
                />
              )}
              <Button
                label={last ? "Finish tour" : "Next"}
                onPress={() => (last ? finish() : set({ tour: step + 1 }))}
              />
            </Row>
          </Row>
          {!last && <Button label="End tour" outline onPress={finish} />}
        </Card>
      </View>
    </Modal>
  );
}
