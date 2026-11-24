import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { useTheme } from "../theme";
import {
  defaultSnapPoints,
  ExpoSheet,
  type SheetProps,
  SheetTitle,
} from "./ExpoSheet";
import "./phoneSheet.css";

export function Sheet(props: SheetProps) {
  const { width } = useWindowDimensions();
  return width < 768 ? <PhoneSheet {...props} /> : <ExpoSheet {...props} />;
}

function PhoneSheet({
  title,
  visible,
  onClose,
  onDismiss,
  snapPoints = defaultSnapPoints,
  children,
}: SheetProps) {
  const c = useTheme();
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  const drag = useRef<{ id: number; startY: number } | null>(null);
  const dragged = useRef(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (visible) {
      if (!element.open) {
        setExpanded(false);
        // Focus the stationary dialog so browsers do not scroll to the
        // handle while its panel is still translating into view.
        element.setAttribute("autofocus", "");
        element.showModal();
      }
      return;
    }
    if (!element.open) return;
    const surface = panel.current;
    const finish = () => {
      if (!element.open) return;
      element.close();
      dismiss.current?.();
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    const onAnimationEnd = (event: AnimationEvent) => {
      if (
        event.target === surface &&
        event.animationName === "phone-sheet-exit"
      )
        finish();
    };
    surface?.addEventListener("animationend", onAnimationEnd);
    const timer = window.setTimeout(finish, 280);
    return () => {
      surface?.removeEventListener("animationend", onAnimationEnd);
      window.clearTimeout(timer);
    };
  }, [visible]);

  useEffect(() => {
    const element = dialog.current;
    const viewport = window.visualViewport;
    if (!visible || !element || !viewport) return;
    // Track the keyboard only while editing. Browser toolbar motion must not
    // change the snap height during the opening animation or a swipe.
    const update = () => {
      const focused = document.activeElement;
      const editing =
        element.contains(focused) &&
        focused?.matches("input, textarea, [contenteditable=true]");
      const inset = editing
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;
      element.style.setProperty("--sheet-keyboard", `${inset}px`);
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    element.addEventListener("focusin", update);
    const clearInset = () => element.style.removeProperty("--sheet-keyboard");
    element.addEventListener("focusout", clearInset);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      element.removeEventListener("focusin", update);
      element.removeEventListener("focusout", clearInset);
      clearInset();
    };
  }, [visible]);

  const height = (expanded ? snapPoints.at(-1) : snapPoints[0]) ?? "50%";
  const heightCss = (unit: "vh" | "svh") =>
    typeof height === "number" ? `${height}px` : height.replace(/%$/, unit);
  const clearDrag = () => {
    drag.current = null;
    panel.current?.style.removeProperty("--sheet-drag");
  };

  return (
    <dialog
      ref={dialog}
      className="phone-sheet"
      aria-labelledby={titleId}
      data-closing={!visible ? "" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="phone-sheet-panel"
        style={
          {
            "--sheet-height": heightCss("vh"),
            "--sheet-stable-height": heightCss("svh"),
            backgroundColor: c.surface,
          } as CSSProperties
        }
      >
        <button
          type="button"
          className="phone-sheet-grip"
          aria-label={expanded ? "Collapse sheet" : "Expand sheet"}
          aria-expanded={expanded}
          onClick={(event) => {
            if (!event.detail || !dragged.current) setExpanded(!expanded);
            dragged.current = false;
          }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            dragged.current = false;
            drag.current = { id: event.pointerId, startY: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const gesture = drag.current;
            if (gesture?.id !== event.pointerId) return;
            const offset = event.clientY - gesture.startY;
            if (Math.abs(offset) > 8) dragged.current = true;
            if (dragged.current)
              panel.current?.style.setProperty(
                "--sheet-drag",
                `${Math.max(0, offset)}px`,
              );
          }}
          onPointerUp={(event) => {
            const gesture = drag.current;
            if (gesture?.id !== event.pointerId) return;
            const offset = event.clientY - gesture.startY;
            clearDrag();
            if (Math.abs(offset) < 40) return;
            dragged.current = true;
            if (offset < 0) setExpanded(true);
            else if (expanded) setExpanded(false);
            else onClose();
          }}
          onPointerCancel={clearDrag}
          onLostPointerCapture={clearDrag}
        >
          <span style={{ backgroundColor: c.muted }} />
        </button>
        <SheetTitle title={title} titleId={titleId} onClose={onClose} />
        <div className="phone-sheet-scroll">
          <View style={{ gap: 14, paddingHorizontal: 20 }}>{children}</View>
        </div>
      </div>
    </dialog>
  );
}
