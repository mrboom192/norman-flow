import { useIsFocused } from "expo-router";
import type { PropsWithChildren } from "react";
import "./desktopPage.css";

export function DesktopPage({ children }: PropsWithChildren) {
  const focused = useIsFocused();
  return (
    <div className="desktop-page" data-focused={focused}>
      {children}
    </div>
  );
}
