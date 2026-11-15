import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Fredoka_600SemiBold } from "@expo-google-fonts/fredoka/600SemiBold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View, Platform } from "react-native";
import { useFlow } from "../store/useFlow";
import { useTheme } from "../theme";
export default function Layout() {
  const [fonts, error] = useFonts({
    Fredoka_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const c = useTheme(),
    dark = useFlow((s) => s.dark);
  if (!fonts && !error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.background,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={c.primary} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: Platform.OS === "web" ? 480 : undefined,
            alignSelf: "center",
          }}
        >
          <StatusBar style={dark ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: c.background },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="welcome" options={{ presentation: "modal" }} />
            <Stack.Screen name="import" options={{ presentation: "modal" }} />
            <Stack.Screen
              name="diagnostics"
              options={{ presentation: "modal" }}
            />
          </Stack>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
