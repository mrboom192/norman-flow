import { router } from "expo-router";
import { Download, ListOrdered, SlidersHorizontal } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { rankSegments } from "../../analysis/rankings";
import { RankKind } from "../../analysis/types";
import { SegmentRow } from "../../components/SegmentRow";
import { Sheet } from "../../components/Sheet";
import {
  Button,
  Chip,
  Empty,
  Input,
  Row,
  Screen,
  T,
} from "../../components/ui";
import { download } from "../../services/download";
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
export default function Rankings() {
  const c = useTheme(),
    ward = useFlow((s) => s.ward),
    result = useFlow((s) => s.results);
  const [kind, setKind] = useState<RankKind>("combined"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("Final rank"),
    [limit, setLimit] = useState(20),
    [sheet, setSheet] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [allWards, setAllWards] = useState(false);
  const citywide = useMemo(
    () => rankSegments(result?.segments ?? []),
    [result],
  );
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
  async function save(all: boolean, city = false) {
    if (!result) return;
    setBusy(true);
    try {
      await download(
        await exportWorkbook(
          result,
          city ? "citywide" : all ? undefined : ward,
        ),
        `Norman-Flow-${city ? "Citywide" : all ? "All-Wards" : "Ward-" + ward}.xlsx`,
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
      <Screen style={{ paddingHorizontal: 0 }}>
        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          <Row>
            <T heading size={29}>
              Rankings
            </T>
            <Row style={{ gap: 4 }}>
              {[
                {
                  key: "kind",
                  icon: ListOrdered,
                  label: `Ranking type: ${kind === "vc" ? "V/C ratio" : kind}`,
                },
                {
                  key: "sort",
                  icon: SlidersHorizontal,
                  label: `Sort by ${sort}`,
                },
                { key: "export", icon: Download, label: "Export rankings" },
              ].map(({ key, icon: Icon, label }) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityHint={
                    key === "export"
                      ? "Opens workbook export options"
                      : "Opens ranking options"
                  }
                  onPress={() => setSheet(key)}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: c.border,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed ? c.primaryTint : c.surface,
                  })}
                >
                  <Icon size={21} strokeWidth={2} color={c.ink} />
                </Pressable>
              ))}
            </Row>
          </Row>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 10,
            paddingBottom: 4,
            paddingHorizontal: 20,
          }}
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
                  setAllWards(value === "all");
                  if (value !== "all") useFlow.getState().set({ ward: value });
                  setLimit(20);
                }}
                style={({ pressed }) => ({
                  minWidth: 64,
                  minHeight: 50,
                  paddingHorizontal: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 15,
                  borderWidth: 2,
                  borderBottomWidth: pressed ? 2 : 5,
                  borderColor: c.ink,
                  backgroundColor: active ? c.primary : c.surface,
                  transform: [{ translateY: pressed ? 3 : 0 }],
                })}
              >
                <T
                  size={15}
                  style={{
                    fontFamily: fonts.bold,
                    color: active ? c.onPrimary : c.ink,
                  }}
                >
                  {value === "all" ? "All" : `Ward ${value}`}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          <Input
            search
            placeholder="Search roads"
            value={query}
            onChangeText={setQuery}
          />
          <Row>
            <T muted size={12}>
              {allWards ? "All of Norman" : `Ward ${ward}`} ·{" "}
              {kind === "vc" ? "V/C" : kind} rank
            </T>
            <T muted size={12}>
              {result ? rows.length : "—"} segments ranked
            </T>
          </Row>
          {sort !== "Final rank" && (
            <T muted size={12}>
              Sorted by {sort}
            </T>
          )}
          <View
            style={{
              gap: 8,
            }}
          >
            {rows.length ? (
              rows
                .slice(0, limit)
                .map((segment) => (
                  <SegmentRow
                    key={segment.id}
                    segment={segment}
                    kind={kind}
                    minimal
                  />
                ))
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
          {rows.length > limit && (
            <Button
              outline
              label="Show more segments"
              onPress={() => setLimit((n) => n + 20)}
            />
          )}
          {Boolean(status) && (
            <T muted size={12} accessibilityLiveRegion="polite">
              {status}
            </T>
          )}
        </View>
      </Screen>
      <Sheet
        title={
          sheet === "kind"
            ? "Ranking type"
            : sheet === "sort"
              ? "Sort rankings"
              : "Export rankings"
        }
        visible={!!sheet}
        onClose={() => setSheet("")}
      >
        {sheet === "kind" ? (
          (["combined", "vc", "collisions"] as RankKind[]).map((key) => (
            <Chip
              key={key}
              label={
                key === "combined"
                  ? "Combined"
                  : key === "vc"
                    ? "V/C ratio"
                    : "Collisions"
              }
              active={kind === key}
              onPress={() => {
                setKind(key);
                setLimit(20);
                setSheet("");
              }}
            />
          ))
        ) : sheet === "sort" ? (
          sorts.map((s) => (
            <Chip
              key={s}
              label={s}
              active={sort === s}
              onPress={() => {
                setSort(s);
                setSheet("");
              }}
            />
          ))
        ) : (
          <>
            <T muted>
              Includes rankings, all segments, unmatched records and run
              settings.
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
            {allWards && (
              <Button
                label={
                  busy ? "Preparing workbook…" : "Export citywide rankings"
                }
                disabled={!result || busy}
                onPress={() => save(false, true)}
              />
            )}
            <Button
              outline
              label="Export all 8 wards"
              disabled={!result || busy}
              onPress={() => save(true)}
            />
            {Boolean(status) && <T>{status}</T>}
          </>
        )}
      </Sheet>
    </View>
  );
}
