import { X } from "lucide-react-native";
import { IconButton, Row, T } from "./ui";
export type SheetProps = {
  title: string;
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  children: React.ReactNode;
};

export function DialogTitle({
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
