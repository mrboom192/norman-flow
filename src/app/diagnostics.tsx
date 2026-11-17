import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import { Card, Chip, IconButton, Row, Screen, T } from "../components/ui";
import { useFlow } from "../store/useFlow";
import { useTheme } from "../theme";
export default function Diagnostics() {
  const c = useTheme(),
    result = useFlow((s) => s.results),
    [filter, setFilter] = useState("Traffic"),
    [limit, setLimit] = useState(50);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <Screen>
        <Row>
          <T heading size={27}>
            Analysis review
          </T>
          <IconButton
            icon={X}
            label="Close diagnostics"
            onPress={() => router.back()}
          />
        </Row>
        {result ? (
          <>
            <Card>
              <T heading size={20}>
                Run complete
              </T>
              <T muted size={12}>
                {new Date(result.runAt).toLocaleString()}
              </T>
              {result.segments.some((s) => s.summarySource) && (
                <T muted size={12}>
                  The base CSV supplies segment totals. The matching diagnostics
                  below count only raw records processed by the app.
                </T>
              )}
              <T>
                {result.diagnostics.countsMatched} traffic counts matched ·{" "}
                {result.diagnostics.countsUnmatched} unmatched
              </T>
              <T>
                {result.diagnostics.collisionsMatched} collisions matched ·{" "}
                {result.diagnostics.collisionsUnmatched} unmatched
              </T>
              <T>
                {result.diagnostics.laneChecks} segments need an aerial lane
                check
              </T>
            </Card>
            <Row style={{ flexWrap: "wrap", justifyContent: "flex-start" }}>
              {["Traffic", "Collision", "Lane checks"].map((f) => (
                <Chip
                  key={f}
                  label={f}
                  active={filter === f}
                  onPress={() => {
                    setFilter(f);
                    setLimit(50);
                  }}
                />
              ))}
            </Row>
            {filter === "Lane checks"
              ? result.segments
                  .filter((s) => s.laneCoverage != null && s.laneCoverage < 100)
                  .slice(0, limit)
                  .map((s) => (
                    <Card key={s.id}>
                      <T>
                        {s.road} · {s.index} of {s.of}
                      </T>
                      <T muted size={12}>
                        {s.laneCoverage}% mapped · {s.flags.join(" · ")}
                      </T>
                    </Card>
                  ))
              : result.unmatched
                  .filter((r) => r.kind === filter)
                  .slice(0, limit)
                  .map((r, i) => (
                    <Card key={`${r.id}-${i}`}>
                      <T>
                        {r.road || "Unnamed road"} · {r.id}
                      </T>
                      <T size={13}>{r.reason}</T>
                      <T muted size={11}>
                        {r.source}
                      </T>
                    </Card>
                  ))}
            <Chip
              label="Show more records"
              onPress={() => setLimit((n) => n + 50)}
            />
            <T muted size={12}>
              The Excel export includes the complete unmatched list and original
              record fields.
            </T>
          </>
        ) : (
          <T>No analysis has been run yet.</T>
        )}
      </Screen>
    </SafeAreaView>
  );
}
