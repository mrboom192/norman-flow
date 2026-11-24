// Expo's documented default export also has a named alias.
// eslint-disable-next-line import/no-named-as-default
import BottomSheet, { BottomSheetView } from "@expo/ui/community/bottom-sheet";
import { useEffect, useRef } from "react";
import { ScrollView } from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../theme";
import { IconButton, Row, T } from "./ui";
export const defaultSnapPoints = ["50%", "90%"];
export type SheetProps = {
  title: string;
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  snapPoints?: (string | number)[];
  children: React.ReactNode;
};

export function SheetTitle({
  title,
  titleId,
  onClose,
}: {
  title: string;
  titleId?: string;
  onClose: () => void;
}) {
  return (
    <Row style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
      <T nativeID={titleId} heading size={22} style={{ flex: 1 }}>
        {title}
      </T>
      <IconButton icon={X} label="Close" onPress={onClose} />
    </Row>
  );
}

export function ExpoSheet({
  title,
  visible,
  onClose,
  onDismiss,
  snapPoints = defaultSnapPoints,
  children,
}: SheetProps) {
  const c = useTheme();
  const sheet = useRef<BottomSheet>(null);
  useEffect(() => {
    if (visible) sheet.current?.snapToIndex(0);
    else sheet.current?.close();
  }, [visible]);
  return (
    <BottomSheet
      ref={sheet}
      index={-1}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: c.surface }}
      onClose={() => {
        onClose();
        onDismiss?.();
      }}
    >
      <BottomSheetView
        style={{
          flex: 1,
          height: "100%",
          minHeight: 0,
          backgroundColor: c.surface,
        }}
      >
        <SheetTitle title={title} onClose={() => sheet.current?.close()} />
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{
            gap: 14,
            paddingHorizontal: 20,
            paddingBottom: 32,
          }}
        >
          {children}
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}
