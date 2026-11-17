import { ShieldCheck, TriangleAlert } from "lucide-react-native";
import { View } from "react-native";
import { useFlow } from "../store/useFlow";
import { fonts, useTheme } from "../theme";
import { T } from "./ui";

export const officialNote =
  "This is the official 2026 data. Please don’t edit it. To update the rankings, run the Norman Flow Excel tool (or the Colab notebook) with the new traffic and crash data, then import the results file it creates here.";

/** Names the loaded dataset: the bundled official results, an imported results file, or an in-app calculation. */
export function useDatasetLabel() {
  const results = useFlow((s) => s.results),
    files = useFlow((s) => s.files);
  const imported = [...files]
    .reverse()
    .find((f) => f.source !== "base" && f.data.summaries);
  if (!results) return { official: false, label: "No results loaded yet" };
  if (!results.official)
    return {
      official: false,
      label: "Unofficial results — calculated in the app",
    };
  return {
    official: true,
    label: imported
      ? `Official results — imported from ${imported.name}`
      : "Official 2026 results — City of Norman, MIS 3213 Group #5",
  };
}

export function OfficialNote() {
  const c = useTheme(),
    { official, label } = useDatasetLabel();
  const Icon = official ? ShieldCheck : TriangleAlert;
  return (
    <View
      style={{
        gap: 6,
        padding: 14,
        borderRadius: 18,
        backgroundColor: c.dataSurface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon size={18} color={c.ink} />
        <T size={13} style={{ flex: 1, fontFamily: fonts.bold }}>
          {label}
        </T>
      </View>
      <T muted size={12}>
        {officialNote}
      </T>
    </View>
  );
}
