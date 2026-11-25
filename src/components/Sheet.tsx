import { useEffect, useRef } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTheme } from "../theme";
import { DialogTitle, type SheetProps } from "./DialogTitle";

export function Sheet({
  title,
  visible,
  onClose,
  onDismiss,
  children,
}: SheetProps) {
  const c = useTheme();
  const wasVisible = useRef(false);
  useEffect(() => {
    const closed = wasVisible.current && !visible;
    wasVisible.current = visible;
    // React Native only delivers the modal's onDismiss event on iOS.
    if (closed && Platform.OS !== "ios") onDismiss?.();
  }, [visible, onDismiss]);
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      onDismiss={Platform.OS === "ios" ? onDismiss : undefined}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          padding: 20,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(24,12,20,0.55)",
        }}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessible={false}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 560,
            maxHeight: "88%",
            paddingTop: 18,
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: c.surface,
          }}
        >
          <DialogTitle title={title} onClose={onClose} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              gap: 14,
              paddingHorizontal: 20,
              paddingBottom: 24,
            }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
