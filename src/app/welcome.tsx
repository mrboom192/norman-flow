import { useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Play } from "lucide-react-native";
import { Button, Card, Logo, Row, Screen, T } from "../components/ui";
import { Sheet } from "../components/Sheet";
import { useFlow } from "../store/useFlow";
import { useTheme } from "../theme";
export default function Welcome() {
  const c = useTheme(),
    set = useFlow((s) => s.set),
    [sheet, setSheet] = useState("");
  const pendingFinish = useRef<boolean | null>(null);
  function finish(tour: boolean) {
    if (sheet) {
      pendingFinish.current = tour;
      setSheet("");
      return;
    }
    completeWelcome(tour);
  }
  function completeWelcome(tour: boolean) {
    set({ welcomeSeen: true, tour: tour ? 0 : null });
    router.replace("/");
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <Screen style={{ padding: 24, paddingTop: 48, gap: 24 }}>
        <View style={{ alignItems: "center", gap: 14 }}>
          <Logo size={96} />
          <T heading size={32} style={{ textAlign: "center", lineHeight: 36 }}>
            Welcome to{"\n"}Norman Flow
          </T>
          <T muted size={15} style={{ textAlign: "center", maxWidth: 300 }}>
            See which Norman road segments rank highest for traffic load and
            collisions, ward by ward.
          </T>
        </View>
        <Card style={{ alignItems: "center", padding: 8, gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play walkthrough"
            onPress={() => setSheet("video")}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: c.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Play size={24} color={c.white} fill={c.white} />
          </Pressable>
          <T heading size={20}>
            How to use the app
          </T>
          <T muted size={13}>
            Video walkthrough · coming soon
          </T>
        </Card>
        <View style={{ gap: 12 }}>
          {[
            "Pick a ward to see its ranked segments",
            "Tap a segment for its V/C and collision details",
            "Upload new counts to re-run the rankings",
          ].map((step, i) => (
            <Row key={step} style={{ justifyContent: "flex-start" }}>
              <View
                style={{
                  height: 32,
                  width: 32,
                  borderRadius: 16,
                  backgroundColor: c.primaryTint,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <T style={{ color: c.primaryText }}>{i + 1}</T>
              </View>
              <T size={14} style={{ flex: 1 }}>
                {step}
              </T>
            </Row>
          ))}
        </View>
        <View style={{ gap: 12, marginTop: 18 }}>
          <Button
            label="Start the tour"
            onPress={() => finish(true)}
            style={{ height: 52 }}
          />
          <Button
            label="Skip for now"
            outline
            onPress={() => setSheet("skip")}
            style={{ borderWidth: 0 }}
          />
        </View>
        <T muted size={12} style={{ textAlign: "center" }}>
          You can replay the tour anytime from the ? button.
        </T>
      </Screen>
      <Sheet
        title={sheet === "skip" ? "Are you sure?" : "Walkthrough coming soon"}
        visible={!!sheet}
        onClose={() => setSheet("")}
        onDismiss={() => {
          const tour = pendingFinish.current;
          pendingFinish.current = null;
          if (tour !== null) completeWelcome(tour);
        }}
      >
        {sheet === "skip" ? (
          <>
            <T muted>
              You can revisit the tutorial from Home or Menu whenever you like.
            </T>
            <Button label="Yes, go to Home" onPress={() => finish(false)} />
            <Button
              outline
              label="Take the tour"
              onPress={() => finish(true)}
            />
          </>
        ) : (
          <>
            <T muted>
              The team is preparing the walkthrough video. You can use the
              guided tour today.
            </T>
            <Button label="Start the tour" onPress={() => finish(true)} />
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}
