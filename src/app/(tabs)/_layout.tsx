import { Tabs, router } from "expo-router";
import { View, Pressable } from "react-native";
import { Home, ChartNoAxesColumn, Bot, Menu } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect } from "react";
import { useTheme } from "../../theme";
import { CoachTour } from "../../components/CoachTour";
import { T } from "../../components/ui";
import { useFlow } from "../../store/useFlow";
const items = [
  { name: "index", label: "Home", icon: Home },
  { name: "ranks", label: "Ranks", icon: ChartNoAxesColumn },
  { name: "chat", label: "Chatbot", icon: Bot },
  { name: "menu", label: "Menu", icon: Menu },
];
export default function TabLayout() {
  const c = useTheme(),
    insets = useSafeAreaInsets(),
    hydrated = useFlow((s) => s.hydrated),
    seen = useFlow((s) => s.welcomeSeen);
  useEffect(() => {
    if (hydrated && !seen) router.push("/welcome");
  }, [hydrated, seen]);
  return (
    <View
      style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: c.background },
        }}
        tabBar={({ state, navigateToTab }) => (
          <View
            style={{
              flexDirection: "row",
              height: 84 + insets.bottom,
              paddingBottom: insets.bottom,
              paddingTop: 10,
              borderTopWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
            }}
          >
            {items.map(({ name, label, icon: Icon }, i) => {
              const active = state.index === i;
              return (
                <Pressable
                  key={name}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                  onPress={() => navigateToTab(state.routes[i].key)}
                  style={{ flex: 1, alignItems: "center", gap: 4 }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 30,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? c.primaryTint : "transparent",
                    }}
                  >
                    <Icon
                      size={20}
                      color={active ? c.primaryText : c.muted}
                      strokeWidth={2}
                    />
                  </View>
                  <T
                    size={11}
                    style={{ color: active ? c.primaryText : c.muted }}
                  >
                    {label}
                  </T>
                </Pressable>
              );
            })}
          </View>
        )}
      >
        {items.map((item) => (
          <Tabs.Screen key={item.name} name={item.name} />
        ))}
      </Tabs>
      <CoachTour />
    </View>
  );
}
