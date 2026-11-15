import { Modal, Pressable, ScrollView, View } from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../theme";
import { IconButton, Row, T } from "./ui";
export function Sheet({
  title,
  visible,
  onClose,
  children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#00000055",
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          accessibilityLabel="Close dialog"
          onPress={onClose}
        />
        <View
          style={{
            maxHeight: "85%",
            backgroundColor: c.surface,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            padding: 20,
            paddingBottom: 32,
            gap: 18,
          }}
        >
          <Row>
            <T heading size={22}>
              {title}
            </T>
            <IconButton icon={X} label="Close" onPress={onClose} />
          </Row>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 14, paddingBottom: 10 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
