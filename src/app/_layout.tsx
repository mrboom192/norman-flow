import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Fredoka_600SemiBold } from "@expo-google-fonts/fredoka/600SemiBold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View, Platform } from "react-native";
import { useEffect, useState } from "react";
import { StartupScreen } from "../components/StartupScreen";
import { initializeData, StartupProgress } from "../services/startup";
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
  const [progress, setProgress] = useState<StartupProgress>({
    step: 0,
    message: "Opening your workspace…",
  });
  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState<string[] | null>(null);
  useEffect(() => {
    initializeData(setProgress)
      .then((warnings) => {
        if (warnings.length) setIssues(warnings);
        else setReady(true);
      })
      .catch((failure) =>
        setIssues([`Could not finish preparing the data: ${String(failure)}`]),
      );
  }, []);
  const fontsReady = Boolean(fonts || error);
  if (!fontsReady || !ready)
    return (
      <SafeAreaProvider>
        <SafeAreaView
          style={{
            flex: 1,
            width: "100%",
            maxWidth: Platform.OS === "web" ? 480 : undefined,
            alignSelf: "center",
          }}
        >
          <StatusBar style={dark ? "light" : "dark"} />
          <StartupScreen
            progress={progress}
            fontsReady={fontsReady}
            issues={issues}
            onContinue={() => setReady(true)}
          />
        </SafeAreaView>
      </SafeAreaProvider>
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
            <Stack.Screen name="search" />
            <Stack.Screen name="welcome" options={{ presentation: "modal" }} />
            <Stack.Screen name="import" options={{ presentation: "modal" }} />
            <Stack.Screen
              name="diagnostics"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="data/[topic]"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen name="videos" options={{ presentation: "modal" }} />
          </Stack>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
