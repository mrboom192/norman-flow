import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Render into the topmost open HTML <dialog> (our web bottom sheets live in the
 * browser's top layer), or the page body when none is open, so overlays show
 * above sheets and aren't positioned inside a transformed container.
 */
export function topLayerPortal(node: ReactNode) {
  const dialogs = document.querySelectorAll("dialog[open]");
  return createPortal(node, dialogs[dialogs.length - 1] ?? document.body);
}
