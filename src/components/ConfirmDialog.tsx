import { Modal, Platform, Pressable, View, type ViewStyle } from "react-native";
import { fonts, useTheme } from "../theme";
import { topLayerPortal } from "./topLayerPortal";
import { T } from "./ui";

export type DialogAction = {
  label: string;
  onPress: () => void;
  /** "cancel" is the default, safe choice; "destructive" is red. */
  tone?: "cancel" | "default" | "destructive";
};

/**
 * A centered confirmation dialog that works on iOS, Android and web (React
 * Native's Alert can't show three buttons on web).
 */
export function ConfirmDialog({
  visible,
  title,
  body,
  actions,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  body: string;
  actions: DialogAction[];
  /** Back button, Escape or tapping outside: the same as Cancel. */
  onDismiss: () => void;
}) {
  const c = useTheme();
  if (!visible) return null;
  const content = (
    <Pressable
      accessibilityLabel="Close dialog"
      onPress={onDismiss}
      style={{
        flex: 1,
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(24,12,20,0.55)",
      }}
    >
      <Pressable
        // Taps inside the card don't dismiss it.
        onPress={() => {}}
        accessibilityRole="alert"
        accessibilityViewIsModal
        style={{
          width: "100%",
          maxWidth: 380,
          gap: 10,
          padding: 20,
          borderRadius: 22,
          backgroundColor: c.surface,
        }}
      >
        <T heading size={20}>
          {title}
        </T>
        <T muted size={14}>
          {body}
        </T>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 8,
          }}
        >
          {actions.map((a) => {
            const destructive = a.tone === "destructive";
            const cancel = a.tone === "cancel";
            return (
              <Pressable
                key={a.label}
                accessibilityRole="button"
                onPress={a.onPress}
                style={({ pressed }) => ({
                  minHeight: 44,
                  paddingHorizontal: 18,
                  borderRadius: 999,
                  justifyContent: "center",
                  borderWidth: cancel ? 1 : 0,
                  borderColor: c.border,
                  backgroundColor: destructive
                    ? c.danger
                    : cancel
                      ? c.surface
                      : c.dataSurface,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <T
                  size={14}
                  style={{
                    fontFamily: fonts.bold,
                    color: destructive ? c.onDanger : c.ink,
                  }}
                >
                  {a.label}
                </T>
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Pressable>
  );
  // On web, bottom sheets are HTML <dialog>s in the browser's top layer, above
  // any z-index, so a Modal would sit behind them. Portal a fixed overlay into
  // the topmost open dialog (or the body) instead.
  if (Platform.OS === "web")
    return topLayerPortal(
      <View
        style={
          { position: "fixed", inset: 0, zIndex: 10000 } as unknown as ViewStyle
        }
      >
        {content}
      </View>,
    );
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      {content}
    </Modal>
  );
}
