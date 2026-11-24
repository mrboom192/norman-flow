import { router, usePathname } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type ActiveTour, getTourStep, tourSteps } from "../config/tours";
import { useFlow } from "../store/useFlow";
import { useTheme } from "../theme";
import { getTourTarget } from "./tourTargets";
import { Button, Card, IconButton, Row, T } from "./ui";

type Bounds = { x: number; y: number; width: number; height: number };

export function CoachTour() {
  const tour = useFlow((s) => s.tour);
  const pathname = usePathname();
  const current = getTourStep(tour);

  useEffect(() => {
    // Let Welcome finish dismissing before navigating to the first stop.
    if (current && pathname !== "/welcome" && pathname !== current.route)
      router.navigate(current.route);
  }, [current, pathname]);

  if (!tour || !current || pathname !== current.route) return null;

  function finish() {
    useFlow.getState().set({ tour: null });
    if (pathname !== "/") router.navigate("/");
  }

  return (
    <TourCallout key={`${tour.mode}:${tour.step}`} tour={tour} onEnd={finish} />
  );
}

function TourCallout({ tour, onEnd }: { tour: ActiveTour; onEnd: () => void }) {
  const { mode, step } = tour;
  const steps = tourSteps[mode];
  const current = steps[step];
  const c = useTheme();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [bounds, setBounds] = useState<Bounds | null>();
  const [cardHeight, setCardHeight] = useState(250);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    const later = (callback: () => void, delay: number) =>
      timers.push(setTimeout(callback, delay));
    const measure = () => {
      getTourTarget(current.target)?.view?.measureInWindow(
        (x, y, width, height) => {
          if (!cancelled)
            setBounds(width && height ? { x, y, width, height } : null);
        },
      );
    };
    let tries = 0;
    const find = () => {
      const target = getTourTarget(current.target);
      if (!target?.view) {
        if (++tries < 12) later(find, 100);
        return;
      }
      const scroll = target.scroll?.current;
      const scrollTo = (y: number) => {
        if (cancelled) return;
        scroll?.scrollTo({ y: Math.max(0, y - 32), animated: false });
        later(measure, 100);
      };
      const content = scroll?.getInnerViewRef();
      if (content) {
        target.view.measureLayout(
          content,
          (_x, y) => scrollTo(y),
          () => scrollTo(target.y),
        );
      } else {
        measure();
      }
    };
    later(find, 260);
    later(() => setBounds((value) => value ?? null), 1700);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [current.target, height, width]);

  if (bounds === undefined) return null;
  const last = step === steps.length - 1;
  const go = (step: number) => useFlow.getState().set({ tour: { mode, step } });
  const shade = "rgba(24,12,20,0.68)";
  const calloutWidth = Math.min(width - 32, 410);
  const topLimit = insets.top + 12;
  const bottomLimit = Math.max(
    topLimit,
    height - insets.bottom - 12 - cardHeight,
  );
  let calloutTop = (topLimit + bottomLimit) / 2;
  let calloutLeft = (width - calloutWidth) / 2;
  let hole: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null = null;

  if (bounds) {
    const top = Math.max(0, bounds.y);
    const bottom = Math.min(height, bounds.y + bounds.height);
    const left = Math.max(0, bounds.x);
    const right = Math.min(width, bounds.x + bounds.width);
    if (bottom > top && right > left) {
      hole = { top, bottom, left, right };
      calloutLeft = Math.max(16, Math.min(left, width - calloutWidth - 16));
      if (bottom + 12 <= bottomLimit) calloutTop = bottom + 12;
      else if (top - cardHeight - 12 >= topLimit)
        calloutTop = top - cardHeight - 12;
      else calloutTop = top > height - bottom ? topLimit : bottomLimit;
    }
  }
  return (
    <Modal transparent visible onRequestClose={onEnd}>
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
            padding: 16,
            gap: 8,
          }}
        >
          <View
            onLayout={({ nativeEvent }) =>
              setCardHeight(nativeEvent.layout.height + 32)
            }
            style={{ gap: 10 }}
          >
            <Row>
              <T muted size={12}>
                {mode === "short" ? "Short tour" : "Detailed tour"} · {step + 1}{" "}
                of {steps.length}
              </T>
              <IconButton icon={X} label="End tour" onPress={onEnd} />
            </Row>
            <T
              heading
              size={21}
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
            >
              {current.title}
            </T>
            <ScrollView
              style={{
                maxHeight: Math.max(
                  60,
                  height - insets.top - insets.bottom - 200,
                ),
              }}
            >
              <T size={14} style={{ lineHeight: 21 }}>
                {current.body}
              </T>
            </ScrollView>
            <Row style={{ justifyContent: "flex-end" }}>
              {step > 0 && (
                <Button outline label="Back" onPress={() => go(step - 1)} />
              )}
              <Button
                label={last ? "Finish tour" : "Next"}
                onPress={last ? onEnd : () => go(step + 1)}
              />
            </Row>
          </View>
        </Card>
      </View>
    </Modal>
  );
}
