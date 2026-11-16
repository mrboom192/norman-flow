import { FileSpreadsheet, FolderOpen, Upload } from "lucide-react-native";
import { View } from "react-native";
import { useTheme } from "../theme";
import { T } from "./ui";

export function FilesEmptyState() {
  const c = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={{ width: 164, height: 132, marginBottom: 8 }}
      >
        <View
          style={{
            position: "absolute",
            width: 120,
            height: 100,
            top: 8,
            left: 24,
            borderRadius: 24,
            backgroundColor: c.chipTint,
            transform: [{ rotate: "-10deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 16,
            left: 20,
            width: 120,
            height: 96,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FolderOpen size={48} color={c.muted} strokeWidth={1.5} />
          <View
            style={{
              position: "absolute",
              top: -8,
              right: 12,
              backgroundColor: c.surface,
              padding: 4,
              borderRadius: 8,
            }}
          >
            <FileSpreadsheet size={24} color={c.muted} strokeWidth={1.5} />
          </View>
        </View>
        <View
          style={{
            position: "absolute",
            right: 8,
            bottom: 4,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: c.primaryTint,
            borderWidth: 4,
            borderColor: c.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Upload size={19} color={c.primaryText} strokeWidth={2} />
        </View>
      </View>
      <T heading size={23} style={{ textAlign: "center" }}>
        Add your first dataset
      </T>
      <T
        muted
        size={13}
        style={{ textAlign: "center", maxWidth: 270, lineHeight: 20 }}
      >
        Upload road segments, traffic counts or collision records to start your
        analysis.
      </T>
      <T muted size={11} style={{ textAlign: "center" }}>
        CSV, XLSX, KML or KMZ
      </T>
    </View>
  );
}
