import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Check, Database, MapPinned, ShieldCheck } from "lucide-react-native";
import { Logo, Button } from "./ui";
import { fonts, useTheme } from "../theme";
import { StartupProgress, startupSteps } from "../services/startup";

export function StartupScreen({
  progress,
  fontsReady,
  issues,
  onContinue,
}: {
  progress: StartupProgress;
  fontsReady: boolean;
  issues: string[] | null;
  onContinue: () => void;
}) {
  const c = useTheme();
  const body = {
    fontFamily: fontsReady ? fonts.body : undefined,
    color: c.ink,
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        padding: 28,
        gap: 28,
      }}
    >
      <View style={{ alignItems: "center", gap: 16 }}>
        <Logo size={88} />
        <Text
          style={{
            ...body,
            fontFamily: fontsReady ? fonts.heading : undefined,
            fontSize: 30,
            textAlign: "center",
          }}
        >
          Norman Flow
        </Text>
        <Text style={{ ...body, fontSize: 17, textAlign: "center" }}>
          {issues ? "Your workspace is ready" : "Getting your roads ready"}
        </Text>
        <Text
          style={{
            ...body,
            color: c.muted,
            fontSize: 13,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          Road segments, traffic counts and collisions, together in one place.
        </Text>
      </View>
      <View
        style={{
          padding: 20,
          borderRadius: 22,
          backgroundColor: c.chipTint,
          gap: 22,
        }}
      >
        {startupSteps.map((label, index) => {
          const done = issues !== null || index < progress.step;
          const active = !issues && index === progress.step;
          const Icon = done ? Check : [Database, MapPinned, ShieldCheck][index];
          return (
            <View
              key={label}
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: c.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {active ? (
                  <ActivityIndicator color={c.primaryText} />
                ) : (
                  <Icon size={19} color={done ? c.primaryText : c.muted} />
                )}
              </View>
              <Text
                style={{
                  ...body,
                  color: active || done ? c.ink : c.muted,
                  fontSize: 14,
                  flex: 1,
                }}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      <View accessibilityLiveRegion="polite" style={{ gap: 12 }}>
        <Text
          style={{
            ...body,
            color: c.muted,
            fontSize: 13,
            lineHeight: 20,
            textAlign: "center",
          }}
        >
          {issues
            ? "Some files need attention. Available files are still ready to use; you can upload replacements from Menu."
            : progress.message}
        </Text>
        {issues?.map((issue, i) => (
          <Text key={i} style={{ ...body, fontSize: 12, lineHeight: 18 }}>
            {issue}
          </Text>
        ))}
        {issues && (
          <Button label="Continue to Norman Flow" onPress={onContinue} />
        )}
      </View>
      {!issues && (
        <Text
          style={{ ...body, color: c.muted, fontSize: 12, textAlign: "center" }}
        >
          Large datasets can take a moment. Keep the app open.
        </Text>
      )}
    </ScrollView>
  );
}
