import { useEffect, useId, useRef } from "react";
import { View } from "react-native";
import { useTheme } from "../theme";
import { DialogTitle, type SheetProps } from "./DialogTitle";
import "./desktopSheet.css";

export function Sheet({
  title,
  visible,
  onClose,
  onDismiss,
  children,
}: SheetProps) {
  const c = useTheme();
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (visible && !dialog.open) dialog.showModal();
    if (!visible && dialog.open) {
      dialog.close();
      onDismiss?.();
    }
  }, [visible, onDismiss]);

  return (
    <dialog
      ref={ref}
      className="desktop-sheet-dialog"
      aria-labelledby={titleId}
      style={{
        backgroundColor: c.surface,
        color: c.ink,
        boxShadow: c.floatShadow,
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <DialogTitle title={title} titleId={titleId} onClose={onClose} />
      <div className="desktop-sheet-content">
        <View style={{ gap: 14, paddingHorizontal: 20, paddingBottom: 24 }}>
          {children}
        </View>
      </div>
    </dialog>
  );
}
