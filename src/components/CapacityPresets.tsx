import { Check, FileText, Lock, Pencil, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import {
  officialCapacities,
  officialPreset,
  officialPresetId,
} from "../analysis/capacity";
import type { CapacityPreset } from "../analysis/types";
import { dialogs } from "../config/dialogs";
import { acogPdf, openBundledFile } from "../services/bundledFiles";
import { useFlow } from "../store/useFlow";
import { fonts, useTheme } from "../theme";
import { ConfirmDialog } from "./ConfirmDialog";
import { Button, IconButton, Input, Row, T } from "./ui";

type Draft = Record<string, string>;
const toDraft = (values: Record<string, number>): Draft =>
  Object.fromEntries(
    Object.keys(officialCapacities).map((k) => [
      k,
      String(values[k] ?? officialCapacities[k].e),
    ]),
  );

/**
 * LOS E capacity presets: the read-only official ACOG table plus custom
 * "what-if" presets that re-rank V/C without touching the official results.
 */
export function CapacityPresets({
  mode,
  onMode,
}: {
  mode: "view" | "edit";
  onMode: (mode: "view" | "edit") => void;
}) {
  const c = useTheme(),
    state = useFlow();
  const activeId = state.settings.capacityPreset?.id ?? officialPresetId;
  const presets = [officialPreset, ...state.capacityPresets];
  const [selectedId, setSelectedId] = useState(activeId);
  const selected = presets.find((p) => p.id === selectedId) ?? officialPreset;
  const official = selected.id === officialPresetId;
  const [draft, setDraft] = useState<Draft>(() => toDraft(selected.values));
  const [naming, setNaming] = useState(false),
    [name, setName] = useState(""),
    [message, setMessage] = useState(""),
    [dialog, setDialog] = useState<"" | "reset" | "delete">(""),
    [resetAfterSave, setResetAfterSave] = useState(false);

  function select(preset: CapacityPreset) {
    setSelectedId(preset.id);
    setDraft(toDraft(preset.values));
    setNaming(false);
    setMessage("");
  }
  function parsed(): Record<string, number> | undefined {
    const values = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [k, Number(v.replace(/,/g, ""))]),
    );
    if (Object.values(values).some((v) => !Number.isFinite(v) || v <= 0)) {
      setMessage("Every capacity must be a number greater than zero.");
      return undefined;
    }
    return values;
  }
  function save() {
    const values = parsed();
    if (!values || official) return;
    state.savePreset({
      ...selected,
      values,
      updatedAt: new Date().toISOString(),
    });
    setMessage(`Saved “${selected.name}”.`);
    return true;
  }
  function saveAsNew() {
    const values = parsed();
    const trimmed = name.trim();
    if (!values) return;
    if (!trimmed) return setMessage("Give the new preset a name.");
    if (presets.some((p) => p.name.toLowerCase() === trimmed.toLowerCase()))
      return setMessage("A preset with that name already exists.");
    const now = new Date().toISOString();
    const preset: CapacityPreset = {
      id: `preset-${now}`,
      name: trimmed,
      values,
      createdAt: now,
      updatedAt: now,
    };
    state.savePreset(preset);
    setSelectedId(preset.id);
    setNaming(false);
    setName("");
    setMessage(`Saved new preset “${trimmed}”.`);
    if (resetAfterSave) {
      setResetAfterSave(false);
      setDraft(toDraft(officialPreset.values));
    }
  }

  if (mode === "edit")
    return (
      <>
        <T muted size={13}>
          Editing{" "}
          <T size={13} style={{ fontFamily: fonts.bold }}>
            {selected.name}
          </T>
          . Daily vehicles at LOS E.
        </T>
        <View>
          {Object.entries(officialCapacities).map(([key, row], i) => (
            <View
              key={key}
              style={{
                paddingVertical: 8,
                gap: 4,
                borderTopWidth: i ? 1 : 0,
                borderColor: c.divider,
              }}
            >
              <Row style={{ gap: 12 }}>
                <T size={13} style={{ flex: 1 }}>
                  {key}
                </T>
                <Input
                  value={draft[key]}
                  keyboardType="numeric"
                  accessibilityLabel={`${key} LOS E capacity`}
                  onChangeText={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                  style={{ width: 120, minHeight: 44 }}
                />
              </Row>
              {row.note && (
                <T muted size={11}>
                  {row.note}
                </T>
              )}
            </View>
          ))}
        </View>
        {!!message && (
          <T size={12} accessibilityLiveRegion="polite">
            {message}
          </T>
        )}
        {naming ? (
          <View style={{ gap: 8 }}>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Preset name, e.g. 2030 widening test"
              accessibilityLabel="New preset name"
              autoFocus
            />
            <Row style={{ gap: 10 }}>
              <Button
                outline
                label="Cancel"
                onPress={() => {
                  setNaming(false);
                  setResetAfterSave(false);
                }}
                style={{ flex: 1 }}
              />
              <Button
                label="Save preset"
                onPress={saveAsNew}
                style={{ flex: 1 }}
              />
            </Row>
          </View>
        ) : (
          <>
            <Row style={{ gap: 10 }}>
              <Button
                label="Save"
                disabled={official}
                onPress={save}
                style={{ flex: 1 }}
              />
              <Button
                outline
                label="Save as new"
                onPress={() => setNaming(true)}
                style={{ flex: 1 }}
              />
            </Row>
            {official && (
              <T muted size={12}>
                The official preset can’t be changed. Use Save as new.
              </T>
            )}
          </>
        )}
        <Button
          danger
          label="Reset LOS E capacities"
          onPress={() => setDialog("reset")}
        />
        <Button outline label="Done" onPress={() => onMode("view")} />
        <ConfirmDialog
          visible={dialog === "reset"}
          title={dialogs.resetCapacities.title}
          body={dialogs.resetCapacities.body}
          onDismiss={() => setDialog("")}
          actions={[
            { label: "Cancel", tone: "cancel", onPress: () => setDialog("") },
            {
              label: dialogs.resetCapacities.saveFirst,
              onPress: () => {
                setDialog("");
                if (official) {
                  // Nothing to save over: name a new preset, then reset.
                  setResetAfterSave(true);
                  setNaming(true);
                } else if (save()) setDraft(toDraft(officialPreset.values));
              },
            },
            {
              label: dialogs.resetCapacities.confirm,
              tone: "destructive",
              onPress: () => {
                setDialog("");
                setDraft(toDraft(officialPreset.values));
                setMessage(
                  "Editor reset to the official ACOG capacities. Nothing is saved until you choose Save or Save as new.",
                );
              },
            },
          ]}
        />
      </>
    );

  return (
    <>
      <T muted size={13}>
        Daily vehicles at LOS E (2025 OCARTS plan). V/C = highest traffic count
        ÷ capacity. Custom presets are what-if tests; the official rankings
        never change.
      </T>
      <View>
        {presets.map((p, i) => {
          const isSelected = p.id === selected.id,
            isActive = p.id === activeId;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => select(p)}
              style={({ pressed }) => ({
                minHeight: 56,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderTopWidth: i ? 1 : 0,
                borderColor: c.divider,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: isSelected ? c.primary : c.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isSelected && (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: c.primary,
                    }}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <T size={14} style={{ fontFamily: fonts.bold }}>
                  {p.name}
                </T>
                <T muted size={11}>
                  {p.id === officialPresetId
                    ? "Built in · read-only · default"
                    : `Updated ${new Date(p.updatedAt).toLocaleDateString()}`}
                  {isActive ? " · in use" : ""}
                </T>
              </View>
              {p.id === officialPresetId ? (
                <Lock size={16} color={c.muted} />
              ) : (
                isActive && <Check size={18} color={c.primaryText} />
              )}
            </Pressable>
          );
        })}
      </View>
      {selected.id !== activeId && (
        <Button
          label={
            official ? "Back to official" : `Use “${selected.name}” for V/C`
          }
          onPress={() => {
            state.applyPreset(selected.id);
            setMessage(
              official
                ? "Showing the official rankings."
                : `What-if view: V/C and combined ranks now use “${selected.name}”.`,
            );
          }}
        />
      )}
      {!!message && (
        <T size={12} accessibilityLiveRegion="polite">
          {message}
        </T>
      )}
      <View
        style={{
          backgroundColor: c.dataSurface,
          borderRadius: 18,
          paddingHorizontal: 14,
        }}
      >
        {Object.entries(officialCapacities).map(([key, row], i) => (
          <View
            key={key}
            style={{
              paddingVertical: 10,
              gap: 2,
              borderTopWidth: i ? 1 : 0,
              borderColor: c.divider,
            }}
          >
            <Row style={{ gap: 12 }}>
              <T size={13} style={{ flex: 1 }}>
                {key}
              </T>
              <T size={13} style={{ fontFamily: fonts.bold }}>
                {(selected.values[key] ?? row.e).toLocaleString()}
              </T>
            </Row>
            {row.note && (
              <T muted size={11}>
                {row.note}
              </T>
            )}
          </View>
        ))}
      </View>
      <Button
        outline
        icon={FileText}
        label="Open the ACOG PDF"
        onPress={() =>
          openBundledFile(acogPdf).catch((e) =>
            setMessage(e instanceof Error ? e.message : String(e)),
          )
        }
      />
      <T muted size={11}>
        The PDF is a scanned fax; the values above are typed from it.
      </T>
      <Row style={{ gap: 10 }}>
        <Button
          icon={Pencil}
          label="Edit LOS E capacities"
          onPress={() => {
            setDraft(toDraft(selected.values));
            setMessage("");
            onMode("edit");
          }}
          style={{ flex: 1 }}
        />
        {!official && (
          <IconButton
            icon={Trash2}
            label={`Delete preset ${selected.name}`}
            onPress={() => setDialog("delete")}
          />
        )}
      </Row>
      <ConfirmDialog
        visible={dialog === "delete"}
        title={dialogs.deletePreset.title}
        body={dialogs.deletePreset.body}
        onDismiss={() => setDialog("")}
        actions={[
          { label: "Cancel", tone: "cancel", onPress: () => setDialog("") },
          {
            label: dialogs.deletePreset.confirm,
            tone: "destructive",
            onPress: () => {
              setDialog("");
              state.deletePreset(selected.id);
              select(officialPreset);
            },
          },
        ]}
      />
    </>
  );
}
