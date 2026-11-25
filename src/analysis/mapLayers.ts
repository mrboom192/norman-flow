// Map data layers: what each one is, its default order and visibility.
// Pure TypeScript: no React Native imports.
import type { RankKind } from "./types";

export const mapLayerInfo = {
  hotspots: {
    label: "Crash hotspots",
    description: "Crash density, with the top 10 crash segments numbered.",
  },
  combined: {
    label: "Combined ranking",
    description: "Ranked roads by V/C rank plus collision rank.",
  },
  vc: {
    label: "V/C ratio",
    description: "Ranked roads by traffic volume over capacity.",
  },
  collisions: {
    label: "Collisions",
    description: "Ranked roads by crash count.",
  },
  segments: {
    label: "Road segments",
    description: "Every study road, colored by length.",
  },
  wards: {
    label: "Ward boundaries",
    description: "City Council wards, with a ward focus option.",
  },
} as const;

export type MapLayer = keyof typeof mapLayerInfo;
export type BasemapType = "map" | "satellite";

/** Layer names only, kept for older callers. */
export const mapLayerLabels = Object.fromEntries(
  Object.entries(mapLayerInfo).map(([key, { label }]) => [key, label]),
) as Record<MapLayer, string>;

// The Data layers page reads front to back. Renderers draw in the reverse order.
export const defaultMapLayerOrder: readonly MapLayer[] = [
  "hotspots",
  "combined",
  "vc",
  "collisions",
  "segments",
  "wards",
];

export const defaultMapLayersVisible: Readonly<Record<MapLayer, boolean>> = {
  hotspots: false,
  combined: false,
  vc: false,
  collisions: false,
  segments: true,
  wards: true,
};

export const rankLayers: readonly (MapLayer & RankKind)[] = [
  "combined",
  "vc",
  "collisions",
];
export const isRankLayer = (layer: MapLayer): layer is MapLayer & RankKind =>
  (rankLayers as readonly MapLayer[]).includes(layer);

const isLayer = (value: unknown): value is MapLayer =>
  typeof value === "string" && value in mapLayerInfo;

/**
 * A saved order with unknown entries dropped and any missing layers added at
 * their default position, so orders saved before a layer existed still work.
 */
export function normalizeLayerOrder(saved: unknown): MapLayer[] {
  const order = Array.isArray(saved) ? [...new Set(saved.filter(isLayer))] : [];
  defaultMapLayerOrder.forEach((layer, index) => {
    if (!order.includes(layer))
      order.splice(Math.min(index, order.length), 0, layer);
  });
  return order;
}

export function normalizeLayersVisible(
  saved: unknown,
): Record<MapLayer, boolean> {
  const next = { ...defaultMapLayersVisible };
  if (saved && typeof saved === "object")
    for (const [key, value] of Object.entries(saved))
      if (isLayer(key) && typeof value === "boolean") next[key] = value;
  return next;
}

/** Visible layers, front to back. */
export function visibleLayers(
  order: readonly MapLayer[],
  visible: Readonly<Record<MapLayer, boolean>>,
) {
  return order.filter((layer) => visible[layer]);
}

export function moveMapLayer(order: MapLayer[], from: number, to: number) {
  const target = Math.max(0, Math.min(order.length - 1, to));
  if (target === from || !order[from]) return order;
  const next = [...order];
  next.splice(target, 0, next.splice(from, 1)[0]);
  return next;
}

/** Per-layer look: opacity 0.1–1 and a line thickness multiplier. */
export type LayerStyle = { opacity: number; width: number };
export const layerStyleRange = {
  opacity: { min: 0.1, max: 1, step: 0.05 },
  width: { min: 0.5, max: 3, step: 0.25 },
} as const;
export const defaultLayerStyle: LayerStyle = { opacity: 1, width: 1 };

/** Hotspots are a density surface, so they have no line thickness. */
export const layerHasWidth = (layer: MapLayer) => layer !== "hotspots";

const clamp = (value: unknown, { min, max }: { min: number; max: number }) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : undefined;

export function normalizeLayerStyles(
  saved: unknown,
): Record<MapLayer, LayerStyle> {
  const source = (saved && typeof saved === "object" ? saved : {}) as Record<
    string,
    Partial<LayerStyle> | undefined
  >;
  return Object.fromEntries(
    defaultMapLayerOrder.map((layer) => [
      layer,
      {
        opacity:
          clamp(source[layer]?.opacity, layerStyleRange.opacity) ??
          defaultLayerStyle.opacity,
        width:
          clamp(source[layer]?.width, layerStyleRange.width) ??
          defaultLayerStyle.width,
      },
    ]),
  ) as Record<MapLayer, LayerStyle>;
}
