import { Platform, useWindowDimensions } from "react-native";

export const desktopContentWidth = 1280;

export function useDesktopLayout() {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= 960;
}
