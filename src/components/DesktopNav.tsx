import { Link, usePathname } from "expo-router";
import { Bot, ChartNoAxesColumn, Home, Map, Menu } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { fonts, useTheme } from "../theme";
import { desktopContentWidth } from "./desktopLayout";
import { Logo, T } from "./ui";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Map", icon: Map },
  { href: "/ranks", label: "Rankings", icon: ChartNoAxesColumn },
  { href: "/chat", label: "Chatbot", icon: Bot },
  { href: "/menu", label: "Menu", icon: Menu },
] as const;

export function DesktopNav() {
  const c = useTheme();
  const pathname = usePathname();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderBottomWidth: 1,
        borderColor: c.border,
      }}
    >
      <View
        accessibilityRole="navigation"
        accessibilityLabel="Main navigation"
        style={{
          width: "100%",
          maxWidth: desktopContentWidth,
          alignSelf: "center",
          paddingHorizontal: 28,
          minHeight: 72,
          flexDirection: "row",
          alignItems: "center",
          gap: 36,
        }}
      >
        <Link href="/" asChild>
          <Pressable
            accessibilityLabel="Norman Flow home"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 44,
            }}
          >
            <Logo size={34} />
            <T heading size={23}>
              Norman Flow
            </T>
          </Pressable>
        </Link>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            const color = active ? c.primaryText : c.muted;
            return (
              <Link key={href} href={href} asChild>
                <Pressable accessibilityState={{ selected: active }}>
                  {({
                    pressed,
                    hovered,
                  }: {
                    pressed: boolean;
                    hovered?: boolean;
                  }) => (
                    <View
                      style={{
                        minHeight: 44,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingHorizontal: 15,
                        borderRadius: 999,
                        backgroundColor: active
                          ? c.primaryTint
                          : hovered || pressed
                            ? c.dataSurface
                            : "transparent",
                      }}
                    >
                      <Icon size={17} color={color} />
                      <T size={14} style={{ color, fontFamily: fonts.bold }}>
                        {label}
                      </T>
                    </View>
                  )}
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
    </View>
  );
}
