import { useMemo, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import {
  Check,
  FlaskConical,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  Chip,
  IconButton,
  Row,
  Screen,
  T,
  Toggle,
} from "../components/ui";
import { OfficialNote } from "../components/OfficialNote";
import { runPipeline } from "../analysis/pipeline";
import { fonts, useTheme } from "../theme";
import { crashYears, parseFile, pickFiles, Picked } from "../services/files";
import { MappingError, Aliases } from "../analysis/parse/columns";
import { combine, DatasetFile, flowStorage, useFlow } from "../store/useFlow";
// Let React commit and paint before starting synchronous workbook parsing or analysis.
const paintLoadingScreen = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
export default function Import() {
  const c = useTheme(),
    state = useFlow();
  const [picked, setPicked] = useState<Picked[]>([]),
    [parsed, setParsed] = useState<DatasetFile[]>([]),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState("Preparing your import…"),
    [error, setError] = useState(""),
    [mapping, setMapping] = useState<MappingError | null>(null),
    [aliases, setAliases] = useState<Aliases>(state.aliases),
    [kind, setKind] = useState<"traffic" | "collisions">("traffic"),
    [stage, setStage] = useState("choose"),
    [advanced, setAdvanced] = useState(false);
  async function parse(
    files: Picked[],
    mappings: Aliases,
    force?: "traffic" | "collisions",
  ) {
    setBusy(true);
    setError("");
    setMapping(null);
    try {
      const next: DatasetFile[] = [];
      for (const [index, f] of files.entries()) {
        const label = `File ${index + 1} of ${files.length} · ${f.name}`;
        setProgress(`Checking ${label}`);
        await paintLoadingScreen();
        next.push(
          await parseFile(
            f,
            mappings,
            force,
            (percent) => setProgress(`Checking ${label} · ${percent}%`),
            { advanced },
          ),
        );
      }
      setPicked([]);
      setParsed(next);
      setStage("preview");
    } catch (e) {
      if (e instanceof MappingError) {
        setMapping(e);
        setStage("mapping");
      } else {
        setError(e instanceof Error ? e.message : String(e));
        setPicked([]);
        setParsed([]);
        setStage("choose");
      }
    } finally {
      setBusy(false);
    }
  }
  async function choose() {
    if (busy) return;
    setError("");
    setBusy(true);
    setProgress("Choose files to import…");
    try {
      const files = await pickFiles(async (name, index, total) => {
        setProgress(`Reading file ${index} of ${total} · ${name}`);
        await paintLoadingScreen();
      });
      if (!files.length) return;
      setPicked(files);
      await parse(files, aliases);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const nextFiles = useMemo(
    () => [
      ...state.files.filter(
        (f) =>
          f.source === "base" ||
          (!parsed.some((p) => p.name === f.name) &&
            !(
              parsed.some((p) => p.data.segments.length) &&
              f.data.segments.length
            ) &&
            !(parsed.some((p) => p.data.wards.length) && f.data.wards.length) &&
            // A new results or crash-points file replaces the earlier upload.
            !(parsed.some((p) => p.data.summaries) && f.data.summaries) &&
            !(parsed.some((p) => p.data.crashPoints) && f.data.crashPoints)),
      ),
      ...parsed,
    ],
    [state.files, parsed],
  );
  const previous = useMemo(() => combine(state.files), [state.files]),
    next = useMemo(() => combine(nextFiles), [nextFiles]);
  // Run every check before anything is saved; a failed check changes nothing.
  const check = useMemo(() => {
    if (stage !== "preview") return null;
    if (
      parsed.some((f) => f.data.segments.length && !f.data.traffic.length) &&
      !next.summaries &&
      !advanced
    )
      return {
        error:
          "New road segments need the matching results file. Import norman_flow_rankings.csv from the same Excel tool run.",
      };
    try {
      return { results: runPipeline(next, state.settings) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [stage, parsed, next, advanced, state.settings]);
  const newResults = parsed.some((f) => f.data.summaries),
    newCrashes = parsed.some((f) => f.data.crashPoints);
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setProgress("Matching records and calculating ward rankings…");
    await paintLoadingScreen();
    try {
      state.set({ aliases });
      state.commit(nextFiles);
      setProgress("Saving your analysis on this device…");
      await flowStorage.flush();
      state.set({ persistenceError: null });
      router.replace("/diagnostics");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <Screen>
        <Row>
          <T heading size={27}>
            Add new data
          </T>
          <IconButton
            icon={X}
            label="Close import"
            onPress={() => {
              if (!busy) router.back();
            }}
          />
        </Row>
        <OfficialNote />
        <Card>
          <View
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: c.border,
              borderRadius: 18,
              padding: 24,
              alignItems: "center",
              gap: 14,
            }}
          >
            <Upload size={32} color={c.primaryText} />
            <T heading size={20}>
              Bring your files together
            </T>
            <T muted size={13} style={{ textAlign: "center" }}>
              {advanced
                ? "Raw traffic counts and collisions: CSV or XLSX\nRoad segments and wards: KML, KMZ or GeoJSON"
                : "Required: norman_flow_rankings.csv\nOptional: norman_segments.geojson, norman_wards.geojson, norman_crash_points.geojson (or a crash sheet with Lat/Lon, for the hotspot map)"}
            </T>
            <Button
              label={
                picked.length || parsed.length
                  ? "Choose different files"
                  : "Choose files"
              }
              onPress={choose}
              disabled={busy}
            />
          </View>
        </Card>
        <Row style={{ gap: 12, minHeight: 56 }}>
          <FlaskConical size={20} color={c.muted} />
          <View style={{ flex: 1 }}>
            <T size={14} style={{ fontFamily: fonts.bold }}>
              Advanced (unofficial)
            </T>
            <T muted size={12}>
              Recalculate from raw traffic and crash spreadsheets in the app.
            </T>
          </View>
          <Toggle
            accessibilityLabel="Advanced (unofficial) import"
            value={advanced}
            disabled={busy}
            onValueChange={(on) => {
              setAdvanced(on);
              setParsed([]);
              setStage("choose");
            }}
          />
        </Row>
        {advanced && (
          <Row
            style={{
              gap: 10,
              padding: 12,
              borderRadius: 16,
              backgroundColor: c.chipTint,
            }}
          >
            <TriangleAlert size={18} color={c.primaryDeep} />
            <T size={12} style={{ flex: 1, color: c.primaryDeep }}>
              Results calculated in the app use different rules from the
              official Excel tool (for example, crash crediting at intersections
              and the team’s lane checks), so they won’t match the official
              rankings.
            </T>
          </Row>
        )}
        {Boolean(error) && (
          <Card>
            <T
              style={{ color: c.primaryText }}
              accessibilityLiveRegion="polite"
            >
              {error}
            </T>
          </Card>
        )}
        {stage === "mapping" && mapping && (
          <Card>
            <T heading size={20}>
              Match your columns
            </T>
            <T muted size={13}>
              {mapping.message} Column order doesn’t matter. Your choices are
              saved on this device for future imports.
            </T>
            <Row>
              <Chip
                label="Traffic counts"
                active={kind === "traffic"}
                onPress={() => setKind("traffic")}
              />
              <Chip
                label="Collisions"
                active={kind === "collisions"}
                onPress={() => setKind("collisions")}
              />
            </Row>
            {mapping.fields.map((field) => (
              <View key={field} style={{ gap: 8 }}>
                <T heading size={18}>
                  {field}
                </T>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {mapping.headers.map((h) => (
                    <Chip
                      key={h}
                      label={h}
                      active={aliases[field]?.[0] === h}
                      onPress={() =>
                        setAliases((a) => ({ ...a, [field]: [h] }))
                      }
                    />
                  ))}
                </View>
              </View>
            ))}
            <Button
              label="Use these columns"
              disabled={busy || mapping.fields.some((f) => !aliases[f]?.length)}
              onPress={() => parse(picked, aliases, kind)}
            />
          </Card>
        )}
        {stage === "preview" && (
          <>
            {!!next.summaries?.length && next.collisions.length > 0 && (
              <T muted>
                Uploaded case records will be used for collision totals in place
                of the published segment totals. The CSV has no case IDs to
                deduplicate. Supply the complete collision history for the
                period you want to rank.
              </T>
            )}
            <Card>
              <Row>
                <T heading size={21}>
                  Review your update
                </T>
                <Check color={c.primaryText} size={23} />
              </Row>
              {parsed.map((f) => (
                <View key={f.name} style={{ gap: 4 }}>
                  <T size={14}>{f.name}</T>
                  <T muted size={12}>
                    {f.summary}
                  </T>
                </View>
              ))}
            </Card>
            {check?.error ? (
              <Card>
                <Row style={{ justifyContent: "flex-start", gap: 10 }}>
                  <TriangleAlert size={20} color={c.primaryDeep} />
                  <T heading size={19}>
                    This file can’t be used
                  </T>
                </Row>
                <T size={13} accessibilityLiveRegion="polite">
                  {check.error}
                </T>
                <T muted size={12}>
                  Nothing has been changed. Your current rankings are still in
                  place.
                </T>
              </Card>
            ) : check?.results ? (
              <Card>
                <Row style={{ justifyContent: "flex-start", gap: 10 }}>
                  <ShieldCheck size={20} color={c.ink} />
                  <T heading size={19}>
                    {check.results.official
                      ? "Official results check passed"
                      : "Unofficial results"}
                  </T>
                </Row>
                <T muted size={12}>
                  {check.results.official
                    ? "Every ward rank matches the file’s ward_ranks, and every V/C equals volume ÷ capacity."
                    : "These rankings are calculated in the app and won’t match the official Excel tool."}
                </T>
                <T size={13}>
                  {
                    new Set(
                      Object.values(check.results.wards).flatMap((w) =>
                        w.vc.map((s) => s.id),
                      ),
                    ).size
                  }{" "}
                  segments ranked
                </T>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {Object.entries(check.results.wards).map(([ward, lists]) => (
                    <Chip key={ward} label={`W${ward}: ${lists.vc.length}`} />
                  ))}
                </View>
                {newResults && !newCrashes && (
                  <T muted size={12}>
                    Hotspot layer:{" "}
                    {crashYears(next.crashPoints ?? []).slice(3) || "earlier"}{" "}
                    data. Add a crash points file to update it.
                  </T>
                )}
              </Card>
            ) : null}
            <Card>
              <T heading size={20}>
                What changes
              </T>
              {[
                [
                  "Road segments",
                  previous.segments.length,
                  next.segments.length,
                ],
                [
                  "Ward boundaries",
                  new Set(previous.wards.map((w) => w.id)).size,
                  new Set(next.wards.map((w) => w.id)).size,
                ],
                [
                  "Traffic counts",
                  previous.traffic.length,
                  next.traffic.length,
                ],
                [
                  "Crash locations (map only)",
                  previous.crashPoints?.length ?? 0,
                  next.crashPoints?.length ?? 0,
                ],
                [
                  "Unique collisions",
                  previous.collisions.length,
                  next.collisions.length,
                ],
              ].map(([label, before, after]) => (
                <Row key={String(label)}>
                  <T size={13}>{label}</T>
                  <T size={13}>
                    {before} → {after}
                  </T>
                </Row>
              ))}
              <T muted size={12}>
                Traffic files add years. Matching collision IDs are merged. New
                road or ward layers replace earlier layers of that kind.
                Uploading the same filename replaces that file.
              </T>
              {!next.segments.length && (
                <T size={12} style={{ color: c.primaryText }}>
                  Road segments are still missing. These records will be saved,
                  but cannot be matched until a segment file is added.
                </T>
              )}
              <Button
                label={busy ? "Running analysis…" : "Confirm & re-rank"}
                onPress={confirm}
                disabled={busy || Boolean(check?.error)}
              />
            </Card>
          </>
        )}
        {stage === "choose" && (
          <Card>
            <T heading size={19}>
              A few taps, no manual cleanup
            </T>
            <T muted size={13}>
              {advanced
                ? "1. Select raw traffic, crash or road files.\n2. Check the preview and column matches.\n3. Confirm to recalculate all eight ward lists in the app."
                : "1. Run the Norman Flow Excel tool (or the Colab notebook) with the new data.\n2. Select the norman_flow_rankings.csv it creates, plus any new map files.\n3. Check the preview, then confirm to update every screen."}
            </T>
            <Button
              outline
              icon={RotateCcw}
              label="Restore official 2026 results"
              disabled={busy}
              onPress={() => {
                state.restoreOfficial();
                router.back();
              }}
            />
          </Card>
        )}
      </Screen>
      {busy && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: c.background,
              padding: 24,
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
            },
          ]}
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
          accessibilityLabel="Import in progress"
        >
          <ActivityIndicator size="large" color={c.primary} />
          <T heading size={26}>
            Preparing your data
          </T>
          <T style={{ textAlign: "center" }}>{progress}</T>
          <T muted size={13} style={{ textAlign: "center" }}>
            Keep the app open. Large files can take a little longer.
          </T>
        </View>
      )}
    </SafeAreaView>
  );
}
