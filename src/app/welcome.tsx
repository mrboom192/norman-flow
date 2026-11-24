import { useRef, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Compass, Map, Play } from "lucide-react-native";
import { Button, Card, Logo, Row, Screen, T } from "../components/ui";
import { Sheet } from "../components/Sheet";
import { useDesktopLayout } from "../components/desktopLayout";
import { tourSteps, type TourMode } from "../config/tours";
import { useFlow } from "../store/useFlow";
import { useTheme } from "../theme";

export default function Welcome() {
  const c = useTheme();
  const desktop = useDesktopLayout();
  const [sheet, setSheet] = useState<"skip" | "video" | null>(null);
  const skipPending = useRef(false);

  function finish(mode?: TourMode) {
    useFlow.getState().set({
      welcomeSeen: true,
      tour: mode ? { mode, step: 0 } : null,
    });
    router.dismissTo("/");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <Screen style={{ padding: 24, paddingTop: desktop ? 48 : 32, gap: 24 }}>
        <View style={{ alignItems: "center", gap: 10 }}>
          <Logo size={76} />
          <T heading size={34} style={{ textAlign: "center" }}>
            Welcome to Norman Flow
          </T>
          <T
            muted
            size={15}
            style={{ textAlign: "center", maxWidth: 430, lineHeight: 22 }}
          >
            Explore how Norman’s road segments rank for traffic load and
            collisions, ward by ward.
          </T>
        </View>

        <View style={{ gap: 12 }}>
          <T heading size={22}>
            Choose a tour
          </T>
          <View style={{ gap: 12, flexDirection: desktop ? "row" : "column" }}>
            {(
              [
                {
                  mode: "short",
                  label: "Short tour",
                  description:
                    "Find a road, read its ranking, ask a question and see where to update the data.",
                  icon: Compass,
                },
                {
                  mode: "detailed",
                  label: "Detailed tour",
                  description:
                    "Walk through the maps, heat layers, all ranking views, exports, imports, diagnostics and settings.",
                  icon: Map,
                },
              ] as const
            ).map(({ mode, label, description, icon: Icon }) => (
              <Card
                key={mode}
                style={{
                  borderWidth: 1,
                  borderColor: c.border,
                  ...(desktop && { flex: 1 }),
                }}
              >
                <Row>
                  <Row style={{ justifyContent: "flex-start", gap: 8 }}>
                    <Icon color={c.primaryText} size={21} />
                    <T heading size={19}>
                      {label}
                    </T>
                  </Row>
                  <T muted size={12}>
                    {tourSteps[mode].length} stops
                  </T>
                </Row>
                <T
                  muted
                  size={14}
                  style={{ lineHeight: 20, ...(desktop && { flex: 1 }) }}
                >
                  {description}
                </T>
                <Button
                  label={`Start ${label.toLowerCase()}`}
                  outline={mode === "short"}
                  onPress={() => finish(mode)}
                />
              </Card>
            ))}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Button
            label="Video walkthrough"
            icon={Play}
            outline
            onPress={() => setSheet("video")}
          />
          <Button
            label="Skip for now"
            outline
            onPress={() => setSheet("skip")}
            style={{ borderWidth: 0 }}
          />
          <T muted size={12} style={{ textAlign: "center" }}>
            Start either tour later from Home’s help button or Menu’s Replay
            tutorial.
          </T>
        </View>
      </Screen>
      <Sheet
        title={sheet === "video" ? "Video walkthrough" : "Skip the tour?"}
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        onDismiss={() => {
          if (!skipPending.current) return;
          skipPending.current = false;
          finish();
        }}
      >
        {sheet === "video" ? (
          <T muted>
            The video walkthrough is coming soon. Both guided tours are
            available now.
          </T>
        ) : (
          <>
            <T muted>You can take either tour later from Home or Menu.</T>
            <Button
              label="Go to Home"
              onPress={() => {
                skipPending.current = true;
                setSheet(null);
              }}
            />
          </>
        )}
        <Button outline label="Choose a tour" onPress={() => setSheet(null)} />
      </Sheet>
    </SafeAreaView>
  );
}
