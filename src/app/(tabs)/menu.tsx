import { useState } from "react";
import { View, Switch, Pressable, Linking } from "react-native";
import { router } from "expo-router";
import { ChevronRight, ChevronDown, Trash2, Upload } from "lucide-react-native";
import {
  Button,
  Card,
  Chip,
  IconButton,
  Input,
  Row,
  Screen,
  T,
} from "../../components/ui";
import { Sheet } from "../../components/Sheet";
import { useFlow } from "../../store/useFlow";
import { colors, fonts, useTheme } from "../../theme";
const expected = [
  ["KMZ", "Road_Segments.kmz", "Road segments and ward boundaries"],
  ["XLSX", "Norman_Traffic_Analysis", "City traffic counts"],
  ["XLSX", "Traffic_Project_OU_FALL", "Collision records and vehicle tables"],
  ["SHP", "odot_aadtc", "Optional ODOT count stations"],
  ["PDF", "ACOG capacity guidelines", "Capacity by number of lanes"],
];
export default function Menu() {
  const c = useTheme(),
    state = useFlow(),
    [advanced, setAdvanced] = useState(false),
    [distance, setDistance] = useState(String(state.settings.matchDistance)),
    [sheet, setSheet] = useState(""),
    [remove, setRemove] = useState(""),
    [segment, setSegment] = useState(""),
    [lanes, setLanes] = useState(""),
    [status, setStatus] = useState(""),
    [capacities, setCapacities] = useState(state.settings.capacities);
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
  return (
    <Screen>
      <T heading size={30}>
        Menu
      </T>
      <Card>
        <Row>
          <T heading size={21}>
            Files
          </T>
          <T muted size={12}>
            {state.files.length
              ? `${state.files.length} files in use`
              : "Ready for your files"}
          </T>
        </Row>
        {state.files.map((f) => (
          <View
            key={f.name}
            style={{
              borderTopWidth: 1,
              borderColor: c.divider,
              paddingTop: 10,
              gap: 8,
            }}
          >
            <Row>
              <FileBadge label={f.type} />
              <View style={{ flex: 1 }}>
                <T size={13} style={{ fontFamily: fonts.bold }}>
                  {f.name}
                </T>
                <T muted size={11}>
                  {f.summary}
                </T>
              </View>
              <IconButton
                icon={Trash2}
                label={`Remove ${f.name}`}
                onPress={() => {
                  setRemove(f.name);
                  setSheet("remove");
                }}
              />
            </Row>
            <Button
              outline
              label="Replace file"
              onPress={() => router.push("/import")}
            />
          </View>
        ))}
        {!state.files.length &&
          expected.map(([type, name, description]) => (
            <View
              key={name}
              style={{
                borderTopWidth: 1,
                borderColor: c.divider,
                paddingTop: 10,
              }}
            >
              <Row>
                <FileBadge label={type} />
                <View style={{ flex: 1 }}>
                  <T size={13} style={{ fontFamily: fonts.bold }}>
                    {name}
                  </T>
                  <T muted size={11}>
                    {description} · awaiting file
                  </T>
                </View>
              </Row>
            </View>
          ))}
        <Button
          outline
          icon={Upload}
          label="Add or replace files"
          onPress={() => router.push("/import")}
        />
        {state.previous && (
          <Button
            outline
            label="Undo last analysis run"
            onPress={() => setSheet("undo")}
          />
        )}
      </Card>
      <Card>
        <View>
          <T heading size={21}>
            Resources
          </T>
          <T muted size={12}>
            Sources used for V/C ratios and segments
          </T>
        </View>
        {[
          [
            "ACOG network capacities",
            "LOS E capacity used for V/C",
            "capacity",
          ],
          [
            "City of Norman interactive map",
            "Aerials for counting lanes",
            "https://www.normanok.gov",
          ],
          ["City Council ward map", "All 8 wards", "https://www.normanok.gov"],
        ].map(([title, subtitle, url]) => (
          <Pressable
            key={title}
            accessibilityRole="button"
            onPress={() =>
              url === "capacity"
                ? setSheet("capacity")
                : Linking.openURL(url).catch(() =>
                    setStatus("Unable to open the browser."),
                  )
            }
            style={{
              borderTopWidth: 1,
              borderColor: c.divider,
              paddingVertical: 10,
              minHeight: 54,
            }}
          >
            <Row>
              <View style={{ flex: 1 }}>
                <T size={14} style={{ fontFamily: fonts.bold }}>
                  {title}
                </T>
                <T muted size={12}>
                  {subtitle}
                </T>
              </View>
              <ChevronRight size={17} color={c.primaryText} />
            </Row>
          </Pressable>
        ))}
      </Card>
      <Card>
        <T heading size={21}>
          Settings
        </T>
        {[
          [
            "Dark mode",
            "Easier on the eyes at night",
            state.dark,
            (v: boolean) => state.set({ dark: v }),
          ],
          [
            "Colorblind-friendly colors",
            "Map and charts use blue/orange",
            state.colorblind,
            (v: boolean) => state.set({ colorblind: v }),
          ],
        ].map(([title, sub, value, onChange]) => (
          <Row
            key={String(title)}
            style={{
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderColor: c.divider,
            }}
          >
            <View style={{ flex: 1 }}>
              <T size={13} style={{ fontFamily: fonts.bold }}>
                {String(title)}
              </T>
              <T muted size={11}>
                {String(sub)}
              </T>
            </View>
            <Switch
              accessibilityLabel={String(title)}
              value={Boolean(value)}
              onValueChange={onChange as (v: boolean) => void}
              trackColor={{ true: c.primary }}
            />
          </Row>
        ))}
        <Row>
          <T size={13} style={{ fontFamily: fonts.bold }}>
            App color
          </T>
          <Row style={{ gap: 2 }}>
            {[
              ["Pink", colors.primary],
              ["Blue", "#2F5FB3"],
              ["Green", "#2E7D4F"],
              ["Plum", "#6B3FA0"],
            ].map(([name, color]) => (
              <Pressable
                key={color}
                accessibilityLabel={`${name} app color`}
                accessibilityRole="button"
                accessibilityState={{ selected: state.primary === color }}
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
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: state.primary === color ? 3 : 1,
                    borderColor: state.primary === color ? c.ink : c.border,
                    backgroundColor: color,
                  }}
                />
              </Pressable>
            ))}
          </Row>
        </Row>
        <Row>
          <Button
            outline
            label="Reset map"
            style={{ flex: 1, paddingHorizontal: 8 }}
            onPress={() => {
              state.set({ selected: null, mapReset: state.mapReset + 1 });
              router.push("/search");
            }}
          />
          <Button
            outline
            label="Replay tutorial"
            style={{ flex: 1, paddingHorizontal: 8 }}
            onPress={() => router.push("/welcome")}
          />
        </Row>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAdvanced(!advanced)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Row>
            <T size={13}>Advanced analysis settings</T>
            <ChevronDown size={18} color={c.muted} />
          </Row>
        </Pressable>
        {advanced && (
          <View style={{ gap: 12 }}>
            <T muted size={12}>
              Traffic matching distance (meters)
            </T>
            <Input
              keyboardType="numeric"
              value={distance}
              onChangeText={setDistance}
              accessibilityLabel="Match distance in meters"
            />
            <T heading size={17}>
              Lane overrides
            </T>
            <T muted size={12}>
              Select a segment and enter its verified lane count. Overrides are
              retained on every rerun.
            </T>
            {state.results?.segments.length ? (
              <>
                <Input
                  value={segment}
                  onChangeText={setSegment}
                  placeholder="Search or enter a segment ID"
                />
                {state.results.segments
                  .filter(
                    (s) => !segment || s.id.includes(segment.toUpperCase()),
                  )
                  .slice(0, 8)
                  .map((s) => (
                    <Chip
                      key={s.id}
                      label={s.id}
                      active={segment === s.id}
                      onPress={() => {
                        setSegment(s.id);
                        setLanes(
                          String(
                            state.settings.laneOverrides[s.id] ?? s.lanes ?? "",
                          ),
                        );
                      }}
                    />
                  ))}
                <Input
                  value={lanes}
                  onChangeText={setLanes}
                  placeholder="Verified lane count"
                  keyboardType="number-pad"
                />
                {Object.keys(state.settings.laneOverrides).length > 0 && (
                  <Button
                    outline
                    label="Clear lane overrides & re-rank"
                    onPress={() =>
                      state.rerun({ ...state.settings, laneOverrides: {} })
                    }
                  />
                )}
              </>
            ) : (
              <T muted size={12}>
                Import road segments to set lane overrides.
              </T>
            )}
            <T heading size={17}>
              Saved column aliases
            </T>
            {Object.entries(state.aliases).length ? (
              Object.entries(state.aliases).map(([field, values]) => (
                <T key={field} size={12}>
                  {field}: {values?.join(", ")}
                </T>
              ))
            ) : (
              <T muted size={12}>
                Standard aliases are active. New column mappings are saved
                during import.
              </T>
            )}
            <Button
              outline
              label="Reset custom column aliases"
              onPress={() => state.set({ aliases: {} })}
            />
            <Button
              outline
              label="Edit LOS E capacities"
              onPress={() => setSheet("editCapacity")}
            />
            <Button label="Save & re-rank" onPress={saveSettings} />
          </View>
        )}
      </Card>
      {status && (
        <T size={12} accessibilityLiveRegion="polite">
          {status}
        </T>
      )}
      <Card style={{ backgroundColor: colors.ink, borderColor: colors.ink }}>
        <T heading size={21} style={{ color: colors.white }}>
          Credits
        </T>
        <T size={14} style={{ color: colors.white }}>
          Built for the MIS Data Analytics Case Competition.
        </T>
        <T size={13} style={{ color: colors.divider }}>
          Thank you to the City of Norman Transportation team.
        </T>
        <T size={11} style={{ color: colors.border }}>
          Team and professor credits will be added before release.
        </T>
      </Card>
      <Sheet
        title={
          sheet === "remove"
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
        {sheet === "remove" ? (
          <>
            <T>{remove}</T>
            <T muted>
              Rankings will be recalculated without this file. The previous run
              can be restored.
            </T>
            <Button
              label="Remove & re-rank"
              onPress={() => {
                state.remove(remove);
                setSheet("");
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
            {Object.entries(capacities).map(([name, value]) => (
              <Row key={name}>
                <T size={12} style={{ flex: 1 }}>
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
                    style={{ width: 110 }}
                  />
                ) : (
                  <T size={13}>{value.e.toLocaleString()}</T>
                )}
              </Row>
            ))}
            {sheet === "editCapacity" && (
              <Button
                label="Use these values"
                onPress={() => {
                  setSheet("");
                  setAdvanced(true);
                }}
              />
            )}
          </>
        )}
      </Sheet>
    </Screen>
  );
}
function FileBadge({ label }: { label: string }) {
  const c = useTheme();
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        backgroundColor: c.primaryTint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <T size={10} style={{ fontFamily: fonts.bold, color: c.primaryDeep }}>
        {label}
      </T>
    </View>
  );
}
