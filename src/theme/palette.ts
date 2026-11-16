export const appColors = [
  ["Green", "#1a8f26"],
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
