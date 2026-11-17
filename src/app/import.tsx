import { useMemo, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { X, Upload, Check } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  Chip,
  IconButton,
  Row,
  Screen,
  T,
} from "../components/ui";
import { useTheme } from "../theme";
import { pickFiles, parseFile, Picked } from "../services/files";
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
    [stage, setStage] = useState("choose");
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
          await parseFile(f, mappings, force, (percent) =>
            setProgress(`Checking ${label} · ${percent}%`),
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
            !(parsed.some((p) => p.data.wards.length) && f.data.wards.length)),
      ),
      ...parsed,
    ],
    [state.files, parsed],
  );
  const previous = useMemo(() => combine(state.files), [state.files]),
    next = useMemo(() => combine(nextFiles), [nextFiles]);
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
        <T muted>
          New files, fresh rankings. Your original records stay intact, and you
          can undo the last run.
        </T>
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
              Crash locations: norman_crash_points.geojson{"\n"}Traffic counts
              and collisions: CSV or XLSX{"\n"}Road segments and wards: KML or
              KMZ
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
                disabled={busy}
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
              1. Select one or more raw files.{"\n"}2. Check the file preview
              and column matches.{"\n"}3. Confirm to calculate all eight ward
              lists.
            </T>
            <T muted size={12}>
              Base files are included when available. Your uploaded road and
              ward layers take precedence; new traffic years add to the
              analysis.
            </T>
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
