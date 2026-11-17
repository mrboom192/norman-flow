import { router } from "expo-router";
import {
  ChevronRight,
  CirclePlay,
  ExternalLink,
  FolderOpen,
  Gauge,
  Globe,
  type LucideIcon,
  Map as MapIcon,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react-native";
import { type ReactNode, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { Sheet } from "../../components/Sheet";
import { useTourTarget } from "../../components/tourTargets";
import {
  Button,
  Chip,
  FileBadge,
  IconButton,
  Input,
  Row,
  Screen,
  T,
  Toggle,
} from "../../components/ui";
import { fileDisplayName } from "../../services/displayNames";
import { useFlow } from "../../store/useFlow";
import { fonts, useTheme } from "../../theme";
import { appColors } from "../../theme/palette";

type MenuSheet =
  "" | "files" | "analysis" | "remove" | "undo" | "capacity" | "editCapacity";

export default function Menu() {
  const c = useTheme(),
    state = useFlow(),
    [distance, setDistance] = useState(String(state.settings.matchDistance)),
    [sheet, setSheet] = useState<MenuSheet>(""),
    [remove, setRemove] = useState(""),
    [segment, setSegment] = useState(""),
    [lanes, setLanes] = useState(""),
    [status, setStatus] = useState(""),
    [capacities, setCapacities] = useState(state.settings.capacities);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const dataTarget = useTourTarget("menu-data", scroll);
  function saveSettings() {
    const meters = Number(distance);
    if (!Number.isFinite(meters) || meters <= 0) {
      setStatus("Enter a match distance greater than zero.");
      return;
    }
    if (
      Object.values(capacities).some((v) => !Number.isFinite(v.e) || v.e <= 0)
    ) {
      setStatus("All LOS E capacities must be positive numbers.");
      return;
    }
    const overrides = { ...state.settings.laneOverrides };
    if (segment) {
      if (!state.results?.segments.some((s) => s.id === segment)) {
        setStatus("Select a valid segment from the list.");
        return;
      }
      const n = Number(lanes);
      if (!Number.isInteger(n) || n < 1 || n > 12) {
        setStatus("Enter a lane count from 1 to 12.");
        return;
      }
      overrides[segment] = n;
    }
    try {
      state.rerun({
        ...state.settings,
        matchDistance: meters,
        laneOverrides: overrides,
        capacities,
      });
      setStatus("Settings saved and analysis rerun.");
    } catch (e) {
      setStatus(String(e));
    }
  }
  const openLink = (url: string) =>
    Linking.openURL(url).catch(() => setStatus("Unable to open the browser."));
  const uploadedCount = state.files.filter(
    (f) => (f.source ?? "uploaded") === "uploaded",
  ).length;
  const overrideCount = Object.keys(state.settings.laneOverrides).length;

  return (
    <View style={{ flex: 1 }}>
      <Screen scrollRef={scroll} style={{ gap: 24 }}>
        <T heading size={30}>
          Menu
        </T>

        <View {...dataTarget}>
          <Section title="Data">
            <MenuRow
              icon={FolderOpen}
              title="Data files"
              subtitle={
                state.files.length
                  ? `${state.files.length} in use${uploadedCount ? ` · ${uploadedCount} uploaded` : ""}`
                  : "No files yet"
              }
              onPress={() => setSheet("files")}
            />
            <MenuRow
              icon={Upload}
              title="Add new data & re-rank"
              subtitle="CSV, XLSX, KML, KMZ or GeoJSON"
              onPress={() => router.push("/import")}
            />
            {state.previous && (
              <MenuRow
                icon={Undo2}
                title="Undo last analysis run"
                subtitle="Restore the previous files and results"
                onPress={() => setSheet("undo")}
              />
            )}
            <MenuRow
              icon={SlidersHorizontal}
              title="Analysis settings"
              subtitle={`Match distance ${state.settings.matchDistance} m${overrideCount ? ` · ${overrideCount} lane override${overrideCount === 1 ? "" : "s"}` : ""}`}
              onPress={() => setSheet("analysis")}
            />
          </Section>
        </View>

        <Section title="Appearance">
          <MenuRow
            icon={Moon}
            title="Dark mode"
            trailing={
              <Toggle
                accessibilityLabel="Dark mode"
                value={state.dark}
                onValueChange={(dark) => state.set({ dark })}
              />
            }
          />
          <View
            style={{
              minHeight: 64,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderTopWidth: 1,
              borderColor: c.divider,
            }}
          >
            <IconTile icon={Palette} />
            <View style={{ flex: 1 }}>
              <T size={14} style={{ fontFamily: fonts.bold }}>
                App color
              </T>
            </View>
            <Row style={{ gap: 0 }}>
              {appColors.map(([name, color]) => {
                const active = state.primary === color;
                return (
                  <Pressable
                    key={color}
                    accessibilityLabel={`${name} app color`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => state.set({ primary: color })}
                    style={{
                      width: 44,
                      height: 44,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        padding: 3,
                        borderWidth: 2,
                        borderColor: active ? c.ink : "transparent",
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          borderRadius: 14,
                          backgroundColor: color,
                        }}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </Row>
          </View>
        </Section>

        <Section title="Help">
          <MenuRow
            icon={CirclePlay}
            title="Replay tutorial"
            onPress={() => router.push("/welcome")}
          />
          <MenuRow
            icon={RotateCcw}
            title="Reset map"
            subtitle="Clear selection, search, filters and zoom"
            onPress={() => {
              state.set({ selected: null, mapReset: state.mapReset + 1 });
              router.push("/search");
            }}
          />
        </Section>

        <Section title="Resources">
          <MenuRow
            icon={Gauge}
            title="ACOG network capacities"
            subtitle="LOS E capacity used for V/C"
            onPress={() => setSheet("capacity")}
          />
          <MenuRow
            icon={Globe}
            title="City of Norman interactive map"
            subtitle="Aerials for counting lanes"
            external
            onPress={() => openLink("https://www.normanok.gov")}
          />
          <MenuRow
            icon={MapIcon}
            title="City Council ward map"
            subtitle="All 8 wards"
            external
            onPress={() => openLink("https://www.normanok.gov")}
          />
        </Section>

        {Boolean(status || state.persistenceError) && (
          <T size={12} accessibilityLiveRegion="polite">
            {status || `Could not save device data: ${state.persistenceError}`}
          </T>
        )}

        <View style={{ alignItems: "center", gap: 4, paddingTop: 4 }}>
          <T heading size={15}>
            Norman Flow
          </T>
          <T muted size={12} style={{ textAlign: "center" }}>
            Built for the MIS Data Analytics Case Competition.{"\n"}Thank you to
            the City of Norman Transportation team.
          </T>
          <T muted size={11} style={{ textAlign: "center" }}>
            Team and professor credits will be added before release.
          </T>
        </View>
      </Screen>

      <Sheet
        title={
          sheet === "files"
            ? "Data files"
            : sheet === "analysis"
              ? "Analysis settings"
              : sheet === "remove"
                ? "Remove this file?"
                : sheet === "undo"
                  ? "Undo the last run?"
                  : sheet === "editCapacity"
                    ? "Edit LOS E capacities"
                    : "ACOG network capacities"
        }
        visible={!!sheet}
        onClose={() => setSheet("")}
      >
        {sheet === "files" ? (
          <>
            <Button
              icon={Upload}
              label="Add or replace files"
              onPress={() => {
                setSheet("");
                router.push("/import");
              }}
            />
            {(["base", "uploaded"] as const).map((source) => {
              const files = state.files.filter(
                (f) => (f.source ?? "uploaded") === source,
              );
              return (
                <View key={source} style={{ gap: 4 }}>
                  <T heading size={17}>
                    {source === "base" ? "Included with the app" : "Uploaded"}
                  </T>
                  <T muted size={12}>
                    {source === "base"
                      ? "Uploaded road and ward layers take precedence over these."
                      : "Saved on this device. Removing a layer falls back to the included data."}
                  </T>
                  {!files.length && (
                    <T muted size={13} style={{ paddingVertical: 10 }}>
                      {source === "base"
                        ? "No base files included in this build."
                        : "No uploaded files yet."}
                    </T>
                  )}
                  {files.map((f, i) => (
                    <Row
                      key={`${f.source ?? "uploaded"}:${f.name}`}
                      style={{
                        minHeight: 64,
                        gap: 12,
                        borderTopWidth: i ? 1 : 0,
                        borderColor: c.divider,
                      }}
                    >
                      <FileBadge label={f.type} />
                      <View style={{ flex: 1 }}>
                        <T size={13} style={{ fontFamily: fonts.bold }}>
                          {fileDisplayName(f)}
                        </T>
                        <T muted size={11}>
                          {f.summary}
                        </T>
                      </View>
                      {source === "uploaded" && (
                        <IconButton
                          icon={Trash2}
                          label={`Remove ${fileDisplayName(f)}`}
                          onPress={() => {
                            setRemove(f.name);
                            setSheet("remove");
                          }}
                          style={{ borderWidth: 0 }}
                        />
                      )}
                    </Row>
                  ))}
                </View>
              );
            })}
          </>
        ) : sheet === "analysis" ? (
          <>
            <SheetLabel
              title="Traffic matching distance"
              body="How close a count point must be to a segment, in meters."
            />
            <Input
              keyboardType="numeric"
              value={distance}
              onChangeText={setDistance}
              accessibilityLabel="Match distance in meters"
            />
            <SheetLabel
              title="Lane overrides"
              body="Pick a segment and enter its verified lane count. Overrides are kept on every rerun."
            />
            {state.results?.segments.length ? (
              <>
                <Input
                  search
                  value={segment}
                  onChangeText={setSegment}
                  placeholder="Search for a segment ID"
                />
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {state.results.segments
                    .filter(
                      (s) => !segment || s.id.includes(segment.toUpperCase()),
                    )
                    .slice(0, 6)
                    .map((s) => (
                      <Chip
                        key={s.id}
                        label={s.id}
                        active={segment === s.id}
                        onPress={() => {
                          setSegment(s.id);
                          setLanes(
                            String(
                              state.settings.laneOverrides[s.id] ??
                                s.lanes ??
                                "",
                            ),
                          );
                        }}
                      />
                    ))}
                </View>
                <Input
                  value={lanes}
                  onChangeText={setLanes}
                  placeholder="Verified lane count"
                  keyboardType="number-pad"
                />
                {overrideCount > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      state.rerun({ ...state.settings, laneOverrides: {} })
                    }
                    style={{ minHeight: 44, justifyContent: "center" }}
                  >
                    <T
                      size={13}
                      style={{ fontFamily: fonts.bold, color: c.primaryText }}
                    >
                      Clear {overrideCount} lane override
                      {overrideCount === 1 ? "" : "s"} & re-rank
                    </T>
                  </Pressable>
                )}
              </>
            ) : (
              <T muted size={12}>
                Import road segments to set lane overrides.
              </T>
            )}
            <SheetLabel
              title="Column aliases"
              body={
                Object.keys(state.aliases).length
                  ? "Custom column mappings saved during import:"
                  : "Standard aliases are active. New column mappings are saved during import."
              }
            />
            {Object.entries(state.aliases).map(([field, values]) => (
              <T key={field} size={12}>
                {field}: {values?.join(", ")}
              </T>
            ))}
            <Row style={{ gap: 10 }}>
              <Button
                outline
                label="Reset aliases"
                disabled={!Object.keys(state.aliases).length}
                onPress={() => state.set({ aliases: {} })}
                style={{ flex: 1, paddingHorizontal: 8 }}
              />
              <Button
                outline
                label="Edit capacities"
                onPress={() => setSheet("editCapacity")}
                style={{ flex: 1, paddingHorizontal: 8 }}
              />
            </Row>
            <Button label="Save & re-rank" onPress={saveSettings} />
            {!!status && (
              <T size={12} accessibilityLiveRegion="polite">
                {status}
              </T>
            )}
          </>
        ) : sheet === "remove" ? (
          <>
            <T>
              {fileDisplayName(
                state.files.find((f) => f.name === remove) ?? { name: remove },
              )}
            </T>
            <T muted>
              Rankings will be recalculated without this file. The previous run
              can be restored.
            </T>
            <Button
              label="Remove & re-rank"
              onPress={() => {
                state.remove(remove);
                setSheet("files");
              }}
            />
          </>
        ) : sheet === "undo" ? (
          <>
            <T muted>
              Your previous input files, analysis settings and results will be
              restored.
            </T>
            <Button
              label="Restore previous run"
              onPress={() => {
                state.undo();
                setSheet("");
              }}
            />
          </>
        ) : (
          <>
            <T muted size={13}>
              Daily vehicles · LOS E (2025 plan). Values supplied in the
              competition brief. The source PDF will be linked when provided.
            </T>
            <View>
              {Object.entries(capacities).map(([name, value], i) => (
                <Row
                  key={name}
                  style={{
                    minHeight: 50,
                    gap: 12,
                    borderTopWidth: i ? 1 : 0,
                    borderColor: c.divider,
                  }}
                >
                  <T size={13} style={{ flex: 1 }}>
                    {name}
                  </T>
                  {sheet === "editCapacity" ? (
                    <Input
                      value={String(value.e)}
                      keyboardType="numeric"
                      onChangeText={(v) =>
                        setCapacities((t) => ({
                          ...t,
                          [name]: { ...value, e: Number(v) },
                        }))
                      }
                      style={{ width: 110, minHeight: 44 }}
                    />
                  ) : (
                    <T size={13} style={{ fontFamily: fonts.bold }}>
                      {value.e.toLocaleString()}
                    </T>
                  )}
                </Row>
              ))}
            </View>
            {sheet === "editCapacity" && (
              <Button
                label="Use these values"
                onPress={() => setSheet("analysis")}
              />
            )}
          </>
        )}
      </Sheet>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <T heading size={19} style={{ marginBottom: 4 }}>
        {title}
      </T>
      {children}
    </View>
  );
}

function MenuRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
  trailing,
  external = false,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  external?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? (external ? "link" : "button") : undefined}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderTopWidth: 1,
        borderColor: c.divider,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <IconTile icon={Icon} />
      <View style={{ flex: 1 }}>
        <T size={14} style={{ fontFamily: fonts.bold }}>
          {title}
        </T>
        {!!subtitle && (
          <T muted size={12}>
            {subtitle}
          </T>
        )}
      </View>
      {trailing ??
        (onPress &&
          (external ? (
            <ExternalLink size={17} color={c.muted} />
          ) : (
            <ChevronRight size={18} color={c.muted} />
          )))}
    </Pressable>
  );
}

function SheetLabel({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ gap: 2, marginTop: 4 }}>
      <T heading size={17}>
        {title}
      </T>
      <T muted size={12}>
        {body}
      </T>
    </View>
  );
}

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  const c = useTheme();
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.dataSurface,
      }}
    >
      <Icon size={19} color={c.ink} />
    </View>
  );
}
