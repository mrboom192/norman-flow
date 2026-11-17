import { fromByteArray } from "base64-js";
import { encode } from "fast-png";
import { buildCrashDensity } from "./crashMap";
import { heatColor } from "./heatmap";
import type { Coordinate, CrashPoint } from "./types";

export function crashDensityImage(points: CrashPoint[], colors: string[]) {
  const raster = buildCrashDensity(points);
  if (!raster) return;
  const { width, height, north, east, south, west } = raster;
  const palette = Array.from({ length: 256 }, (_, i) => {
    const hex = heatColor(i, { min: 0, max: 255 }, colors, colors[0]);
    return [
      ...[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)),
      Math.round(255 * Math.min(0.85, (i / 255) * 2.5)),
    ];
  });
  const pixels = new Uint8Array(width * height * 4);
  const scale = 255 / Math.log1p(raster.max);
  raster.values.forEach((value, index) => {
    if (value > 0)
      pixels.set(palette[Math.round(Math.log1p(value) * scale)], index * 4);
  });
  const uri =
    "data:image/png;base64," +
    fromByteArray(encode({ width, height, data: pixels, channels: 4 }));
  const bounds: [Coordinate, Coordinate] = [
    [north, east],
    [south, west],
  ];
  return { uri, bounds };
}
