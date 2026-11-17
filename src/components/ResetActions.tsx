import { RotateCcw } from "lucide-react-native";
import { useState } from "react";
import type { ViewStyle } from "react-native";
import { dialogs } from "../config/dialogs";
import { useFlow } from "../store/useFlow";
import { ConfirmDialog } from "./ConfirmDialog";
import { Button } from "./ui";

/**
 * Menu's red Reset map: after confirmation, deletes every added file and
 * capacity override and returns to the bundled official 2026 results.
 */
export function ResetMapButton({
  onDone,
  style,
}: {
  onDone?: () => void;
  style?: ViewStyle;
}) {
  const resetMap = useFlow((s) => s.resetMap),
    [open, setOpen] = useState(false);
  return (
    <>
      <Button
        danger
        icon={RotateCcw}
        label="Reset map"
        onPress={() => setOpen(true)}
        style={style}
      />
      <ConfirmDialog
        visible={open}
        title={dialogs.resetMap.title}
        body={dialogs.resetMap.body}
        onDismiss={() => setOpen(false)}
        actions={[
          { label: "Cancel", tone: "cancel", onPress: () => setOpen(false) },
          {
            label: dialogs.resetMap.confirm,
            tone: "destructive",
            onPress: () => {
              setOpen(false);
              resetMap();
              onDone?.();
            },
          },
        ]}
      />
    </>
  );
}

/** Red Reset custom column aliases, with a confirmation first. */
export function ResetAliasesButton({ style }: { style?: ViewStyle }) {
  const aliases = useFlow((s) => s.aliases),
    set = useFlow((s) => s.set),
    [open, setOpen] = useState(false);
  return (
    <>
      <Button
        danger
        label="Reset custom column aliases"
        disabled={!Object.keys(aliases).length}
        onPress={() => setOpen(true)}
        style={style}
      />
      <ConfirmDialog
        visible={open}
        title={dialogs.resetAliases.title}
        body={dialogs.resetAliases.body}
        onDismiss={() => setOpen(false)}
        actions={[
          { label: "Cancel", tone: "cancel", onPress: () => setOpen(false) },
          {
            label: dialogs.resetAliases.confirm,
            tone: "destructive",
            onPress: () => {
              setOpen(false);
              set({ aliases: {} });
            },
          },
        ]}
      />
    </>
  );
}
