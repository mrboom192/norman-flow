export const appColors = [
  // Darkened from #1a8f26 so white button text passes 4.5:1 (4.75).
  ["Green", "#188523"],
  ["Blue", "#1056c7"],
  ["Plum", "#C96FF2"],
  ["Pink", "#f6b0e8"],
] as const;
export const defaultPrimary = appColors[3][1];

// Use a readable foreground for both pale and saturated accent colors.
export function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function accentText(hex: string) {
  let color = hex;
  while (1.05 / (luminance(color) + 0.05) < 4.5) {
    color = `#${[1, 3, 5]
      .map((offset) =>
        Math.floor(parseInt(color.slice(offset, offset + 2), 16) * 0.9)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
  }
  return color;
}

/** A hex (#rgb, #rrggbb) or rgb()/rgba() color with its alpha multiplied by `alpha`. */
export function withAlpha(color: string, alpha: number) {
  const a = Math.max(0, Math.min(1, alpha));
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  if (hex) {
    const body =
      hex[1].length === 3 ? [...hex[1]].map((ch) => ch + ch).join("") : hex[1];
    const base = hex[2] ? parseInt(hex[2], 16) / 255 : 1;
    return `#${body}${Math.round(base * a * 255)
      .toString(16)
      .padStart(2, "0")}`;
  }
  const rgb =
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(
      color,
    );
  if (rgb)
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${(rgb[4] ? Number(rgb[4]) : 1) * a})`;
  return color;
}
