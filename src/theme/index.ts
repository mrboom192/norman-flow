import { useFlow } from "../store/useFlow";
import { accentText, defaultPrimary, luminance } from "./palette";
export const colors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  primary: defaultPrimary,
  primaryText: accentText(defaultPrimary),
  primaryDeep: "#404040",
  primaryTint: "#F0F0F0",
  chipTint: "#F5F5F5",
  border: "#E5E5E5",
  divider: "#EBEBEB",
  ink: "#171717",
  muted: "#626262",
  blue: "#2F5FB3",
  blueTint: "#F0F0F0",
  mapBlue: "#3B5BA9",
  segmentShort: "#e90017",
  segmentLong: "rgb(154, 0, 243)",
  segmentOneMile: "#4065d3",
  crashHeatColors: ["#FFF2A6", "#FDB44B", "#EF642D", "#C52223", "#780016"],
  crashMarker: "#780016",
  crashBlurPx: 2,
  heatColors: ["#84f255", "#fae55a", "#f7b044", "#D55E00", "#9f0000"],
  heatGlowLayers: [
    { width: 22, opacity: 0.06 },
    { width: 15, opacity: 0.1 },
    { width: 9, opacity: 0.18 },
  ],
  orange: "#AD5900",
  mapBackground: "#F5F5F5",
  // Ward order follows the reference map: coral, sand, lavender, indigo,
  // yellow, green, cyan and rose. Keep these stable across app themes.
  wardFills: [
    "#d5c0ec",
    "#ebf2aa",
    "#e08bad",
    "#6ad3ae",
    "#fac5ef",
    "#98E991",
    "#7bfdff",
    "#f09e52",
  ],
  wardStrokes: [
    "#c09aea",
    "#e9f484",
    "#d76e98",
    "#3ccc99",
    "#f693e2",
    "#72e968",
    "#54f7fa",
    "#f19138",
  ],
  wardFillOpacity: 0.65,
  wardStrokeWidth: 1.5,
  darkSurface: "#202020",
  darkMuted: "#B3B3B3",
  darkTint: "#2A2A2A",
  white: "#FFFFFF",
  dataSurface: "#F5F5F5",
  dataInk: "#171717",
  dataMuted: "#1C1C1C",
  // Rank badges for 1st, 2nd and 3rd. Dark ink text passes 4.5:1 on all three.
  medals: ["#F2C230", "#C9CED6", "#D08A4E"],
  medalBorders: ["#B8890F", "#8E96A3", "#9A5A26"],
  // Lift for controls floating over the map.
  floatShadow: "0px 6px 20px rgba(23, 23, 23, 0.14)",
};
export const fonts = {
  heading: "Fredoka_600SemiBold",
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  bold: "Inter_600SemiBold",
};
export const shape = { card: 22, pill: 999, padding: 20, gap: 18 };
export function segmentLengthColor(lengthMi: number) {
  let color = colors.segmentShort;
  if (0.75 <= lengthMi && lengthMi <= 1.25) color = colors.segmentOneMile;
  if (lengthMi > 1.25) color = colors.segmentLong;
  return color;
}
export function useTheme() {
  const dark = useFlow((s) => s.dark),
    primary = useFlow((s) => s.primary);
  return {
    ...colors,
    primary,
    primaryText: accentText(primary),
    onPrimary: luminance(primary) > 0.179 ? colors.ink : colors.white,
    ...(dark
      ? {
          background: colors.ink,
          surface: colors.darkSurface,
          ink: colors.white,
          muted: colors.darkMuted,
          primaryText: lightenAccent(primary),
          primaryDeep: "#D4D4D4",
          primaryTint: colors.darkTint,
          chipTint: colors.darkTint,
          divider: "#2E2E2E",
          border: "#383838",
          blueTint: colors.darkTint,
          blue: "#AAC8FF",
          mapBackground: "#1D1D1D",
          dataSurface: "#242424",
          floatShadow: "0px 6px 20px rgba(0, 0, 0, 0.45)",
        }
      : {}),
  };
}
function lightenAccent(hex: string) {
  return `#${[1, 3, 5]
    .map((offset) =>
      Math.round(parseInt(hex.slice(offset, offset + 2), 16) * 0.4 + 255 * 0.6)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
export const format = (n: number | undefined | null, decimals?: number) =>
  n == null
    ? "—"
    : decimals !== undefined
      ? n.toFixed(decimals)
      : n.toLocaleString("en-US");
