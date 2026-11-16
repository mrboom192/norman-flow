import { router } from "expo-router";
import { Layers, Maximize } from "lucide-react-native";
import { View } from "react-native";
import { useFlow } from "../store/useFlow";
import { useTheme } from "../theme";
import { RoadMap } from "./RoadMap";
import { IconButton, T } from "./ui";

export function MapPreviewCard() {
  const c = useTheme();
  const hasGeometry = useFlow((state) =>
    state.files.some(
      (file) =>
        file.visible && (file.data.segments.length || file.data.wards.length),
    ),
  );

  return (
    <View
      style={{
        minHeight: 300,
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: c.mapBackground,
      }}
    >
      <View style={{ flex: 1 }} pointerEvents="none">
        <RoadMap preview />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          backgroundColor: c.surface,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 12,
        }}
      >
        <T heading size={13}>
          Norman map
        </T>
      </View>
      <View style={{ position: "absolute", top: 16, right: 16, gap: 10 }}>
        <IconButton
          icon={Maximize}
          label="Open full map"
          onPress={() => router.push("/search")}
          style={{ borderRadius: 24, borderWidth: 0 }}
        />
        <IconButton
          icon={Layers}
          label="Open map layers"
          onPress={() =>
            router.push({ pathname: "/search", params: { panel: "layers" } })
          }
          style={{ borderRadius: 24, borderWidth: 0 }}
        />
      </View>
      {hasGeometry && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderRadius: 12,
            backgroundColor: c.surface,
            padding: 10,
          }}
        >
          <View style={{ width: 16, height: 3, backgroundColor: c.mapBlue }} />
          <T muted size={11}>
            Roads (1 mi+)
          </T>
          <View
            style={{
              width: 12,
              height: 12,
              backgroundColor: c.primaryTint,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 3,
              marginLeft: 4,
            }}
          />
          <T muted size={11}>
            Wards
          </T>
        </View>
      )}
    </View>
  );
}
