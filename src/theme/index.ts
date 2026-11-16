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
  orange: "#AD5900",
  mapBackground: "#F5F5F5",
  wardFills: ["#E5E5E5", "#F0F0F0", "#D4D4D4", "#FAFAFA"],
  darkSurface: "#202020",
  darkMuted: "#B3B3B3",
  darkTint: "#2A2A2A",
  white: "#FFFFFF",
  dataSurface: "#F5F5F5",
  dataInk: "#171717",
  dataMuted: "#1C1C1C",
};
export const fonts = {
  heading: "Fredoka_600SemiBold",
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  bold: "Inter_600SemiBold",
};
export const shape = { card: 22, pill: 999, padding: 20, gap: 18 };
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
          wardFills: ["#303030", "#262626", "#383838", "#222222"],
          dataSurface: "#242424",
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
