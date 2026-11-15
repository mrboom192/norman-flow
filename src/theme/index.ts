import { useFlow } from "../store/useFlow";
export const colors = {
  background: "#FFF5F8",
  surface: "#FFFFFF",
  primary: "#C2255C",
  primaryText: "#B0174F",
  primaryDeep: "#8A0F3C",
  primaryTint: "#FDE2EA",
  chipTint: "#FFF0F4",
  border: "#F3B6CA",
  divider: "#F6E1E8",
  ink: "#2A1A21",
  muted: "#5E4853",
  blue: "#2F5FB3",
  blueTint: "#E8EFFB",
  mapBlue: "#3B5BA9",
  orange: "#AD5900",
  mapBackground: "#F8F4F7",
  wardFills: ["#FCE1E9", "#FDF0D9", "#E4F0EF", "#ECE7FC"],
  darkSurface: "#392630",
  darkMuted: "#DFC4D0",
  darkTint: "#523142",
  white: "#FFFFFF",
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
    ...(dark
      ? {
          background: colors.ink,
          surface: colors.darkSurface,
          ink: colors.white,
          muted: colors.darkMuted,
          primaryText: "#FFB0CF",
          primaryDeep: "#FFD4E4",
          primaryTint: colors.darkTint,
          chipTint: colors.darkTint,
          divider: "#634453",
          border: "#8F6075",
          blueTint: "#24395C",
          blue: "#AAC8FF",
          mapBackground: "#241D28",
        }
      : {}),
  };
}
export const format = (n: number | undefined | null, decimals?: number) =>
  n == null
    ? "—"
    : decimals !== undefined
      ? n.toFixed(decimals)
      : n.toLocaleString("en-US");
