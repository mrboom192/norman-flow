import { router } from "expo-router";
import {
  Bot,
  Map,
  Route,
  TrafficCone,
  TriangleAlert,
  Upload,
} from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import { ScrollView, View } from "react-native";
import { CoachTour } from "../../components/CoachTour";
import { DataStatCard } from "../../components/DataStatCard";
import { MapPreviewCard } from "../../components/MapPreviewCard";
import { Button, Card, Logo, Row, Screen, T } from "../../components/ui";
import { combine, useFlow } from "../../store/useFlow";
import { colors, format, useTheme } from "../../theme";
export default function Home() {
  const c = useTheme(),
    state = useFlow(),
    data = useMemo(() => combine(state.files), [state.files]),
    top = state.results?.wards[state.ward].combined.slice(0, 3) ?? [];
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const targets = useRef<(React.ComponentRef<typeof View> | null)[]>([]);
  const positions = useRef<number[]>([]);
  const measure = useCallback(
    (
      step: number,
      callback: (bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
      }) => void,
    ) => {
      let measurement: ReturnType<typeof setTimeout>;
      const timer = setTimeout(() => {
        scroll.current?.scrollTo({
          y: Math.max(0, (positions.current[step] ?? 0) - 100),
          animated: true,
        });
        measurement = setTimeout(
          () =>
            targets.current[step]?.measureInWindow((x, y, width, height) =>
              callback({ x, y, width, height }),
            ),
          400,
        );
      }, 100);
      return () => {
        clearTimeout(timer);
        clearTimeout(measurement);
      };
    },
    [],
  );
  const importData = () => router.push("/import");
  return (
    <Screen scrollRef={scroll}>
      <Row>
        <Row style={{ justifyContent: "flex-start" }}>
          <Logo />
          <T heading size={23}>
            Norman Flow
          </T>
        </Row>
      </Row>
      {/* <View style={{ gap: 4 }}>
        <T heading size={30} style={{ lineHeight: 34, maxWidth: 330 }}>
          Which roads need attention?
        </T>
        <T muted size={15}>
          Road segments ranked by traffic load and collisions, for each of
          Norman’s 8 city wards.
        </T>
      </View>
      <Input
        search
        placeholder="Find a street, segment or ward"
        onChangeText={(query) =>
          router.push({ pathname: "/search", params: { q: query } })
        }
      /> */}
      <MapPreviewCard />
      <View
        ref={(view) => {
          targets.current[2] = view;
        }}
        onLayout={(e) => {
          positions.current[2] = e.nativeEvent.layout.y;
        }}
        style={{ gap: 16 }}
      >
        <View>
          <T heading size={20}>
            Data in this analysis
          </T>
          <T muted size={12}>
            Last updated{" "}
            {state.results?.runAt
              ? new Date(state.results.runAt).toLocaleDateString()
              : "—"}
          </T>
        </View>
        <Row style={{ alignItems: "stretch", gap: 14 }}>
          <DataStatCard
            icon={Route}
            value={data.segments.length ? format(data.segments.length) : "—"}
            label="Road segments"
            backgroundColor="#dd5f5f"
          />
          <DataStatCard
            icon={Map}
            value={
              data.wards.length
                ? format(new Set(data.wards.map((w) => w.id)).size)
                : "—"
            }
            label="City wards"
            backgroundColor="#F5AF5B"
          />
        </Row>
        <Row style={{ alignItems: "stretch", gap: 14 }}>
          <DataStatCard
            icon={TrafficCone}
            value={
              data.summaries?.length
                ? format(
                    state.results?.segments.filter(
                      (s) => s.maxVolume !== undefined,
                    ).length,
                  )
                : data.traffic.length
                  ? format(data.traffic.length)
                  : "—"
            }
            label={
              data.summaries?.length
                ? "Segments with traffic"
                : "Traffic counts"
            }
            detail={
              data.traffic.length
                ? [...new Set(data.traffic.map((t) => t.year).filter(Boolean))]
                    .sort()
                    .join(", ")
                : undefined
            }
            backgroundColor="#f1e17b"
          />
          <DataStatCard
            icon={TriangleAlert}
            value={
              data.collisions.length
                ? format(data.collisions.length)
                : data.summaries?.length
                  ? format(
                      data.summaries.reduce((sum, r) => sum + r.collisions, 0),
                    )
                  : "—"
            }
            label={
              !data.collisions.length && data.summaries?.length
                ? "Reported collisions"
                : "Collision records"
            }
            detail={
              data.collisions.length
                ? yearRange(data.collisions.map((record) => record.year))
                : data.summaries?.length
                  ? "On verified segments"
                  : undefined
            }
            backgroundColor="#64d87d"
          />
        </Row>
        <Button
          icon={Upload}
          label="Add new data & re-rank"
          onPress={importData}
        />
        {state.results && (
          <Button
            outline
            label="Review analysis diagnostics"
            onPress={() => router.push("/diagnostics")}
          />
        )}
      </View>
      <Card style={{ backgroundColor: colors.ink, borderColor: colors.ink }}>
        <Row style={{ justifyContent: "flex-start" }}>
          <Bot color={colors.border} size={23} />
          <T heading size={20} style={{ color: colors.white }}>
            Ask me about the data
          </T>
        </Row>
        {["How is V/C calculated?", `What’s #1 in Ward ${state.ward}?`].map(
          (q) => (
            <Button
              key={q}
              label={q}
              onPress={() =>
                router.push({ pathname: "/chat", params: { question: q } })
              }
            />
          ),
        )}
      </Card>
      <CoachTour measure={measure} />
    </Screen>
  );
}

function yearRange(values: (number | undefined)[]) {
  const years = values.filter((value): value is number => value !== undefined);
  if (!years.length) return "years unknown";
  const first = Math.min(...years),
    last = Math.max(...years);
  return first === last ? String(first) : `${first}–${last}`;
}
