import { FlaskConical, ShieldCheck, TriangleAlert } from "lucide-react-native";
import { Pressable, View, type ViewStyle } from "react-native";
import { officialPresetId } from "../analysis/capacity";
import { describeDataset } from "../services/dataset";
import { useFlow } from "../store/useFlow";
import { fonts, useTheme } from "../theme";
import { T } from "./ui";

/**
 * Says which rankings are on screen (official, imported or unofficial) and
 * flags a what-if capacity preset, each with a one-tap way back to official.
 */
export function DatasetBanner({ style }: { style?: ViewStyle }) {
  const results = useFlow((s) => s.results),
    files = useFlow((s) => s.files),
    settings = useFlow((s) => s.settings),
    restoreOfficial = useFlow((s) => s.restoreOfficial),
    applyPreset = useFlow((s) => s.applyPreset);
  const dataset = describeDataset(results, files, settings);
  if (dataset.kind === "none") return null;
  const official = dataset.kind === "official";
  return (
    <View style={[{ gap: 6 }, style]}>
      {dataset.whatIf && (
        <Line
          icon={FlaskConical}
          text={dataset.whatIf}
          action="Back to official"
          onAction={() => applyPreset(officialPresetId)}
          tone="warn"
        />
      )}
      {/* With a what-if preset on official data, the what-if line says it all. */}
      {!(dataset.whatIf && official) && (
        <Line
          icon={official ? ShieldCheck : TriangleAlert}
          text={dataset.viewing}
          action={official ? undefined : "Use base data only"}
          onAction={restoreOfficial}
          tone={official ? "plain" : "warn"}
        />
      )}
    </View>
  );
}

function Line({
  icon: Icon,
  text,
  action,
  onAction,
  tone,
}: {
  icon: typeof ShieldCheck;
  text: string;
  action?: string;
  onAction: () => void;
  tone: "plain" | "warn";
}) {
  const c = useTheme();
  const ink = tone === "warn" ? c.primaryDeep : c.muted;
  return (
    <View
      accessibilityRole="summary"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingLeft: 12,
        paddingRight: action ? 4 : 12,
        minHeight: 36,
        borderRadius: 14,
        backgroundColor: tone === "warn" ? c.chipTint : c.dataSurface,
        borderWidth: tone === "warn" ? 1 : 0,
        borderColor: c.border,
      }}
    >
      <Icon size={15} color={ink} />
      <T size={12} style={{ flex: 1, color: ink, paddingVertical: 6 }}>
        {text}
      </T>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: 10,
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <T size={12} style={{ fontFamily: fonts.bold, color: c.ink }}>
            {action}
          </T>
        </Pressable>
      )}
    </View>
  );
}
