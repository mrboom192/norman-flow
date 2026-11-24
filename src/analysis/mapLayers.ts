export const mapLayerLabels = {
  hotspots: "Crash hotspots",
  segments: "Road segments",
  wards: "Ward boundaries",
} as const;

export type MapLayer = keyof typeof mapLayerLabels;

// The Layers panel reads front to back. Renderers draw in the reverse order.
export const defaultMapLayerOrder: readonly MapLayer[] = [
  "hotspots",
  "segments",
  "wards",
];

export function moveMapLayer(order: MapLayer[], from: number, to: number) {
  const target = Math.max(0, Math.min(order.length - 1, to));
  if (target === from || !order[from]) return order;
  const next = [...order];
  next.splice(target, 0, next.splice(from, 1)[0]);
  return next;
}
