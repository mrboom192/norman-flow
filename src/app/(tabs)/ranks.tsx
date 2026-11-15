import { useState } from "react";
import { View, Pressable } from "react-native";
import { Download, ChevronDown } from "lucide-react-native";
import { router } from "expo-router";
import {
  Button,
  Chip,
  Empty,
  Input,
  Row,
  Screen,
  T,
  WardPicker,
} from "../../components/ui";
import { Sheet } from "../../components/Sheet";
import { SegmentRow } from "../../components/SegmentRow";
import { useFlow } from "../../store/useFlow";
import { RankKind } from "../../analysis/types";
import { fonts, useTheme } from "../../theme";
import { exportWorkbook } from "../../services/export";
import { download } from "../../services/download";
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
    [busy, setBusy] = useState(false);
  const rows = [...(result?.wards[ward][kind] ?? [])].filter((s) =>
    s.road.toLowerCase().includes(query.toLowerCase()),
  );
  if (sort !== "Final rank")
    rows.sort((a, b) =>
      sort === "A–Z"
        ? a.road.localeCompare(b.road)
        : sort === "V/C ratio"
          ? (b.vc ?? -1) - (a.vc ?? -1)
          : sort === "Collisions"
            ? b.collisions - a.collisions
            : sort === "Traffic volume"
              ? (b.maxVolume ?? 0) - (a.maxVolume ?? 0)
              : (b.lanes ?? 0) - (a.lanes ?? 0),
    );
  async function save(all: boolean) {
    if (!result) return;
    setBusy(true);
    try {
      await download(
        await exportWorkbook(result, all ? undefined : ward),
        `Norman-Flow-${all ? "All-Wards" : "Ward-" + ward}.xlsx`,
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
    <Screen>
      <Row>
        <T heading size={29}>
          Final Rankings
        </T>
        <Button
          label="Export"
          icon={Download}
          outline
          onPress={() => setSheet("export")}
          style={{ paddingHorizontal: 13 }}
        />
      </Row>
      <WardPicker />
      <View
        style={{
          flexDirection: "row",
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 16,
          padding: 4,
          backgroundColor: c.surface,
        }}
      >
        {(["combined", "vc", "collisions"] as RankKind[]).map((key, i) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: kind === key }}
            key={key}
            onPress={() => {
              setKind(key);
              setLimit(20);
            }}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              backgroundColor: kind === key ? c.ink : "transparent",
            }}
          >
            <T
              size={13}
              style={{
                fontFamily: fonts.bold,
                color: kind === key ? c.surface : c.muted,
              }}
            >
              {["Combined", "V/C ratio", "Collisions"][i]}
            </T>
          </Pressable>
        ))}
      </View>
      <Row>
        <Input
          search
          placeholder="Search this list"
          value={query}
          onChangeText={setQuery}
          style={{ flex: 1 }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheet("sort")}
          style={{
            minHeight: 50,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 999,
            paddingHorizontal: 12,
            backgroundColor: c.surface,
          }}
        >
          <Row style={{ flex: 1 }}>
            <T muted size={12}>
              Sort
            </T>
            <T size={12}>{sort}</T>
            <ChevronDown size={14} color={c.muted} />
          </Row>
        </Pressable>
      </Row>
      <Row>
        <T muted size={12}>
          Ward {ward} · {kind === "vc" ? "V/C" : kind} rank
        </T>
        <T muted size={12}>
          {result ? rows.length : "—"} segments ranked
        </T>
      </Row>
      {rows.length ? (
        rows
          .slice(0, limit)
          .map((s) => <SegmentRow key={s.id} segment={s} kind={kind} />)
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
              : "Import the raw files to calculate this ward’s rankings. Results will appear here automatically."
          }
          action={() => router.push("/import")}
        />
      )}{" "}
      {rows.length > limit && (
        <Button
          outline
          label="Show more segments"
          onPress={() => setLimit((n) => n + 20)}
        />
      )}{" "}
      {status && (
        <T muted size={12} accessibilityLiveRegion="polite">
          {status}
        </T>
      )}
      <Sheet
        title={sheet === "sort" ? "Sort rankings" : "Export rankings"}
        visible={!!sheet}
        onClose={() => setSheet("")}
      >
        {sheet === "sort" ? (
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
            <Button
              outline
              label="Export all 8 wards"
              disabled={!result || busy}
              onPress={() => save(true)}
            />
            {status && <T>{status}</T>}
          </>
        )}
      </Sheet>
    </Screen>
  );
}
