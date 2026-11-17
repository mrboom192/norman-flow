import type { ReactNode } from "react";

/** Native: overlays use React Native's Modal, so no portal is needed. */
export function topLayerPortal(node: ReactNode) {
  return node;
}
