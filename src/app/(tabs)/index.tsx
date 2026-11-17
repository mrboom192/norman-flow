import { router } from "expo-router";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CircleHelp,
  type LucideIcon,
  Map,
  Route,
  Stethoscope,
  TrafficCone,
  TriangleAlert,
  Upload,
} from "lucide-react-native";
import { type ReactNode, useMemo, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { DataStatCard } from "../../components/DataStatCard";
import { MapPreviewCard } from "../../components/MapPreviewCard";
import { useTourTarget } from "../../components/tourTargets";
import { Logo, Row, Screen, T } from "../../components/ui";
import { combine, useFlow } from "../../store/useFlow";
import { colors, fonts, format, useTheme } from "../../theme";

export default function Home() {
  const state = useFlow(),
    data = useMemo(() => combine(state.files), [state.files]);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const mapTarget = useTourTarget("home-map", scroll);
  const dataTarget = useTourTarget("home-data", scroll);
  const trafficYears = [
    ...new Set(data.traffic.map((t) => t.year).filter(Boolean)),
  ]
    .sort()
    .join(", ");

  return (
    <Screen scrollRef={scroll} style={{ gap: 26 }}>
      <Row>
        <Row style={{ justifyContent: "flex-start", gap: 10 }}>
          <Logo />
          <T heading size={23}>
            Norman Flow
          </T>
        </Row>
        <RoundButton
          icon={CircleHelp}
          label="How to use the app"
          onPress={() => router.push("/welcome")}
        />
      </Row>

      <View {...mapTarget}>
        <MapPreviewCard />
      </View>

      <View {...dataTarget} style={{ gap: 12 }}>
        <SectionHeader
          title="Data in this analysis"
          subtitle={`Last updated ${
            state.results?.runAt
              ? new Date(state.results.runAt).toLocaleDateString()
              : "—"
          }`}
        />
        <Row style={{ alignItems: "stretch", gap: 12 }}>
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
        <Row style={{ alignItems: "stretch", gap: 12 }}>
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
            detail={trafficYears || undefined}
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
        <ActionRow
          icon={Upload}
          title="Add new data & re-rank"
          subtitle="Preview changes before anything is saved"
          primary
          onPress={() => router.push("/import")}
        />
        {state.results && (
          <ActionRow
            icon={Stethoscope}
            title="Review analysis diagnostics"
            subtitle="Matched and unmatched records, lane checks"
            onPress={() => router.push("/diagnostics")}
          />
        )}
      </View>

      <View
        style={{
          backgroundColor: colors.ink,
          borderRadius: 24,
          padding: 18,
          gap: 12,
        }}
      >
        <Row style={{ justifyContent: "flex-start", gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.darkTint,
            }}
          >
            <Bot color={colors.white} size={19} />
          </View>
          <View style={{ flex: 1 }}>
            <T heading size={19} style={{ color: colors.white }}>
              Ask me about the data
            </T>
            <T size={12} style={{ color: colors.darkMuted }}>
              Offline answers from this analysis
            </T>
          </View>
        </Row>
        {[
          `What’s #1 in Ward ${state.ward}?`,
          "How is V/C calculated?",
          "Why are only some segments ranked?",
        ].map((q) => (
          <Pressable
            key={q}
            accessibilityRole="button"
            accessibilityLabel={`Ask: ${q}`}
            onPress={() =>
              router.push({ pathname: "/chat", params: { question: q } })
            }
            style={({ pressed }) => ({
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 14,
              borderRadius: 16,
              backgroundColor: colors.darkSurface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <T
              size={14}
              style={{ flex: 1, color: colors.white, fontFamily: fonts.medium }}
            >
              {q}
            </T>
            <ArrowUpRight size={17} color={colors.darkMuted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <Row style={{ alignItems: "flex-end" }}>
      <View style={{ flex: 1 }}>
        <T heading size={20}>
          {title}
        </T>
        {!!subtitle && (
          <T muted size={12}>
            {subtitle}
          </T>
        )}
      </View>
      {action}
    </Row>
  );
}

function RoundButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.dataSurface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon size={20} color={c.ink} />
    </Pressable>
  );
}

function ActionRow({
  icon: Icon,
  title,
  subtitle,
  primary = false,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  const ink = primary ? c.onPrimary : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: primary ? c.primary : c.dataSurface,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icon size={20} color={ink} />
      <View style={{ flex: 1 }}>
        <T size={14} style={{ fontFamily: fonts.bold, color: ink }}>
          {title}
        </T>
        <T size={12} style={{ color: primary ? c.onPrimary : c.muted }}>
          {subtitle}
        </T>
      </View>
      <ArrowRight size={18} color={ink} />
    </Pressable>
  );
}

function yearRange(values: (number | undefined)[]) {
  const years = values.filter((value): value is number => value !== undefined);
  if (!years.length) return "years unknown";
  const first = Math.min(...years),
    last = Math.max(...years);
  return first === last ? String(first) : `${first}–${last}`;
}
