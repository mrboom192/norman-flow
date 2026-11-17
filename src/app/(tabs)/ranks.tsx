import { router } from "expo-router";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Download,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { rankSegments } from "../../analysis/rankings";
import { RankKind } from "../../analysis/types";
import { DatasetBanner } from "../../components/DatasetBanner";
import { SegmentRow } from "../../components/SegmentRow";
import { Sheet } from "../../components/Sheet";
import { useTourTarget } from "../../components/tourTargets";
import { Button, Empty, Input, Row, Screen, T } from "../../components/ui";
import { download } from "../../services/download";
import { describeDataset } from "../../services/dataset";
import { exportWorkbook } from "../../services/export";
import { useFlow } from "../../store/useFlow";
import { fonts, useTheme } from "../../theme";

const sorts = [
  "Final rank",
  "V/C ratio",
  "Collisions",
  "Traffic volume",
  "Lanes",
  "A–Z",
];
const kinds: { key: RankKind; label: string; description: string }[] = [
  {
    key: "combined",
    label: "Combined",
    description: "V/C rank + collision rank, lowest score first",
  },
  {
    key: "vc",
    label: "V/C ratio",
    description: "Traffic volume ÷ LOS E capacity, highest first",
  },
  {
    key: "collisions",
    label: "Collisions",
    description: "Crashes on the segment, most first",
  },
];

export default function Rankings() {
  const c = useTheme(),
    ward = useFlow((s) => s.ward),
    result = useFlow((s) => s.results);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const wardsTarget = useTourTarget("ranks-wards", scroll);
  const firstTarget = useTourTarget("ranks-first", scroll);
  const [kind, setKind] = useState<RankKind>("combined"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("Final rank"),
    [limit, setLimit] = useState(20),
    [sheet, setSheet] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [allWards, setAllWards] = useState(false),
    [highlight, setHighlight] = useState<{ id: string; key: number } | null>(
      null,
    ),
    [notice, setNotice] = useState(""),
    [handledFocus, setHandledFocus] = useState(0);
  // The map's "See its rank" asks to show one segment: pick a list that has it,
  // clear search and sort, and make sure its row is loaded.
  const rankFocus = useFlow((s) => s.rankFocus);
  if (rankFocus && rankFocus.key !== handledFocus && result) {
    setHandledFocus(rankFocus.key);
    setAllWards(false);
    setQuery("");
    setSort("Final rank");
    const lists = result.wards[rankFocus.ward];
    const found = ([kind, "combined", "vc", "collisions"] as RankKind[]).find(
      (k) => lists?.[k].some((s) => s.id === rankFocus.id),
    );
    if (found) {
      const index = lists[found].findIndex((s) => s.id === rankFocus.id);
      setKind(found);
      setLimit(Math.max(20, Math.ceil((index + 1) / 20) * 20));
      setHighlight({ id: rankFocus.id, key: rankFocus.key });
      setNotice("");
    } else {
      const segment = result.segments.find((s) => s.id === rankFocus.id);
      setHighlight(null);
      setNotice(
        segment
          ? `${segment.road}, segment ${segment.index}, isn’t ranked in Ward ${rankFocus.ward}${segment.preparedStatus ? ` (${segment.preparedStatus.replace(/^Not ranked - /, "")})` : ""}.`
          : "That segment isn’t in the loaded rankings.",
      );
    }
  }
  // Row positions, for scrolling to the highlighted row. The first row sits
  // in its own container (the tour target), the rest in a second one.
  const containerY = useRef({ first: 0, rest: 0 });
  const rowY = useRef<
    Record<string, { container: "first" | "rest"; y: number }>
  >({});
  useEffect(() => {
    if (!highlight) return;
    // Wait for the list to lay out at its new length before scrolling.
    const timer = setTimeout(() => {
      const row = rowY.current[highlight.id];
      if (row)
        scroll.current?.scrollTo({
          y: Math.max(0, containerY.current[row.container] + row.y - 140),
          animated: true,
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [highlight]);
  const clearFocus = () => {
    setHighlight(null);
    setNotice("");
  };
  const citywide = useMemo(
    () => rankSegments(result?.segments ?? []),
    [result],
  );
  const kindInfo = kinds.find((k) => k.key === kind)!;
  const rows = [
    ...(allWards ? citywide[kind] : (result?.wards[ward]?.[kind] ?? [])),
  ].filter((s) => s.road.toLowerCase().includes(query.toLowerCase()));
  if (sort !== "Final rank")
    rows.sort((a, b) =>
      sort === "A–Z"
        ? a.road.localeCompare(b.road)
        : sort === "V/C ratio"
          ? (b.vc ?? -1) - (a.vc ?? -1)
          : sort === "Collisions"
            ? (b.collisions ?? -1) - (a.collisions ?? -1)
            : sort === "Traffic volume"
              ? (b.maxVolume ?? 0) - (a.maxVolume ?? 0)
              : (b.lanes ?? 0) - (a.lanes ?? 0),
    );
  // A new highlight remounts its row so it opens expanded.
  const rowKey = (id: string) =>
    highlight?.id === id ? `${id}:${highlight.key}` : id;
  async function save(all: boolean, city = false) {
    if (!result) return;
    setBusy(true);
    const { files, settings } = useFlow.getState();
    const dataset = describeDataset(result, files, settings);
    try {
      await download(
        await exportWorkbook(
          result,
          city ? "citywide" : all ? undefined : ward,
          dataset.header,
        ),
        `Norman-Flow-${dataset.fileTag}-${city ? "Citywide" : all ? "All-Wards" : "Ward-" + ward}.xlsx`,
      );
      setSheet("");
      setStatus("Workbook exported.");
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ flex: 1 }}>
      <Screen scrollRef={scroll} style={{ paddingHorizontal: 0 }}>
        <Row style={{ paddingHorizontal: 20 }}>
          <T heading size={30}>
            Rankings
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export rankings"
            accessibilityHint="Opens workbook export options"
            onPress={() => setSheet("export")}
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
            <Download size={20} color={c.ink} />
          </Pressable>
        </Row>
        <DatasetBanner style={{ paddingHorizontal: 20 }} />

        <View {...wardsTarget} style={{ gap: 16 }}>
          <View
            accessibilityRole="tablist"
            accessibilityLabel="Ranking type"
            style={{
              flexDirection: "row",
              marginHorizontal: 20,
              padding: 4,
              borderRadius: 24,
              backgroundColor: c.dataSurface,
            }}
          >
            {kinds.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: kind === item.key }}
                onPress={() => {
                  if (kind === item.key) return;
                  clearFocus();
                  setKind(item.key);
                  setSort("Final rank");
                  setLimit(20);
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    kind === item.key ? c.primary : c.dataSurface,
                }}
              >
                <T
                  size={14}
                  style={{
                    fontFamily: fonts.bold,
                    color: kind === item.key ? c.onPrimary : c.ink,
                  }}
                >
                  {item.label}
                </T>
              </Pressable>
            ))}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
            accessibilityLabel="Filter rankings by ward"
          >
            {(["all", 1, 2, 3, 4, 5, 6, 7, 8] as const).map((value) => {
              const active =
                value === "all" ? allWards : !allWards && ward === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={
                    value === "all" ? "All wards" : `Ward ${value}`
                  }
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    clearFocus();
                    setAllWards(value === "all");
                    if (value !== "all")
                      useFlow.getState().set({ ward: value });
                    setLimit(20);
                  }}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    paddingHorizontal: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    backgroundColor: active ? c.primary : c.dataSurface,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <T
                    size={14}
                    style={{
                      fontFamily: fonts.bold,
                      color: active ? c.onPrimary : c.muted,
                    }}
                  >
                    {value === "all" ? "Citywide" : `Ward ${value}`}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <Row style={{ gap: 10 }}>
              <Dropdown
                icon={ArrowUpDown}
                label={sort}
                accessibilityLabel={`Sort by ${sort}`}
                onPress={() => setSheet("sort")}
              />
            </Row>
            <Input
              search
              placeholder="Search roads"
              value={query}
              onChangeText={setQuery}
              style={{ borderWidth: 0, backgroundColor: c.dataSurface }}
            />
          </View>
        </View>

        <View
          {...firstTarget}
          onLayout={(e) => {
            firstTarget.onLayout(e);
            containerY.current.first = e.nativeEvent.layout.y;
          }}
          style={{ paddingHorizontal: 20 }}
        >
          <Row style={{ alignItems: "flex-end" }}>
            <T heading size={19}>
              {allWards ? "All of Norman" : `Ward ${ward}`}
            </T>
            <T muted size={12}>
              {result ? rows.length : "—"} ranked
            </T>
          </Row>
          <T muted size={12} style={{ marginTop: 2, marginBottom: 6 }}>
            {kindInfo.description}
            {sort !== "Final rank" ? ` · sorted by ${sort}` : ""}
          </T>
          {!!notice && (
            <T
              size={13}
              accessibilityLiveRegion="polite"
              style={{
                padding: 12,
                marginBottom: 6,
                borderRadius: 14,
                color: c.primaryDeep,
                backgroundColor: c.chipTint,
              }}
            >
              {notice}
            </T>
          )}
          {rows[0] ? (
            <View
              onLayout={(e) => {
                rowY.current[rows[0].id] = {
                  container: "first",
                  y: e.nativeEvent.layout.y,
                };
              }}
            >
              <SegmentRow
                key={rowKey(rows[0].id)}
                segment={rows[0]}
                kind={kind}
                highlighted={highlight?.id === rows[0].id}
              />
            </View>
          ) : (
            <Empty
              title={
                query
                  ? "No matching segments"
                  : result
                    ? "No segments in this list"
                    : "Rankings are waiting for data"
              }
              body={
                query
                  ? "Try another road name."
                  : "Import the raw files to calculate ward rankings. Results will appear here automatically."
              }
              action={() => router.push("/import")}
            />
          )}
        </View>

        {/* Rows after the first sit outside the tour target so it stays one row tall. */}
        <View
          onLayout={(e) => {
            containerY.current.rest = e.nativeEvent.layout.y;
          }}
          style={{ paddingHorizontal: 20, marginTop: -16 }}
        >
          {rows.slice(1, limit).map((segment) => (
            <View
              key={segment.id}
              onLayout={(e) => {
                rowY.current[segment.id] = {
                  container: "rest",
                  y: e.nativeEvent.layout.y,
                };
              }}
            >
              <SegmentRow
                key={rowKey(segment.id)}
                segment={segment}
                kind={kind}
                divider
                highlighted={highlight?.id === segment.id}
              />
            </View>
          ))}
          {rows.length > limit && (
            <Button
              outline
              label={`Show more (${rows.length - limit} left)`}
              onPress={() => setLimit((n) => n + 20)}
              style={{ marginTop: 8 }}
            />
          )}
          {Boolean(status) && (
            <T
              muted
              size={12}
              accessibilityLiveRegion="polite"
              style={{ marginTop: 8 }}
            >
              {status}
            </T>
          )}
        </View>
      </Screen>

      <Sheet
        title={sheet === "sort" ? "Sort rankings" : "Export rankings"}
        visible={!!sheet}
        onClose={() => setSheet("")}
      >
        {sheet === "sort" ? (
          <View>
            {sorts.map((s, i) => (
              <OptionRow
                key={s}
                label={s}
                selected={sort === s}
                divider={i > 0}
                onPress={() => {
                  setSort(s);
                  setSheet("");
                }}
              />
            ))}
          </View>
        ) : (
          <>
            <T muted size={13}>
              One Excel workbook with the rankings, every segment, unmatched
              records and the run settings.
            </T>
            {!result && (
              <T>
                No analysis has been run yet. Add data to export computed
                rankings.
              </T>
            )}
            <Button
              label={busy ? "Preparing workbook…" : `Export Ward ${ward}`}
              disabled={!result || busy}
              onPress={() => save(false)}
            />
            <Button
              outline
              label="Export all 8 wards"
              disabled={!result || busy}
              onPress={() => save(true)}
            />
            {allWards && (
              <Button
                outline
                label="Export citywide rankings"
                disabled={!result || busy}
                onPress={() => save(false, true)}
              />
            )}
            {Boolean(status) && <T size={12}>{status}</T>}
          </>
        )}
      </Sheet>
    </View>
  );
}

function Dropdown({
  icon: Icon,
  label,
  accessibilityLabel,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens ranking options"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 46,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon size={17} color={c.muted} />
      <T
        size={13}
        numberOfLines={1}
        style={{ flex: 1, fontFamily: fonts.bold }}
      >
        {label}
      </T>
      <ChevronDown size={16} color={c.muted} />
    </Pressable>
  );
}

function OptionRow({
  label,
  description,
  selected,
  divider,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  divider: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderTopWidth: divider ? 1 : 0,
        borderColor: c.divider,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <T size={14} style={{ fontFamily: fonts.bold }}>
          {label}
        </T>
        {!!description && (
          <T muted size={12}>
            {description}
          </T>
        )}
      </View>
      {selected && <Check size={20} color={c.primaryText} />}
    </Pressable>
  );
}
