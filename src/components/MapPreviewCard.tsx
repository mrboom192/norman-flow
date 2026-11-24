import { router } from "expo-router";
import { Layers, Maximize } from "lucide-react-native";
import { useState } from "react";
import { Platform, View } from "react-native";
import { useFlow } from "../store/useFlow";
import { useTheme } from "../theme";
import { RoadMap } from "./RoadMap";
import type { BasemapStatus } from "./GoogleBasemap";
import { useDesktopLayout } from "./desktopLayout";
import { SegmentLengthLegend } from "./SegmentLengthLegend";
import { IconButton, T } from "./ui";

export function MapPreviewCard() {
  const c = useTheme();
  const desktop = useDesktopLayout();
  const [basemap, setBasemap] = useState<BasemapStatus>("unavailable");
  const hasGeometry = useFlow((state) =>
    state.files.some(
      (file) =>
        file.visible && (file.data.segments.length || file.data.wards.length),
    ),
  );

  return (
    <View
      style={{
        minHeight: desktop ? 450 : 300,
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: c.mapBackground,
      }}
    >
      <View
        style={{ flex: 1 }}
        pointerEvents={Platform.OS === "web" ? "box-none" : "none"}
      >
        <RoadMap preview onBasemapStatus={setBasemap} />
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
            bottom: basemap === "ready" ? 32 : 16,
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
          <SegmentLengthLegend />
          <View style={{ flexDirection: "row", marginLeft: 4, gap: 2 }}>
            {c.wardFills.map((fill, index) => (
              <View
                key={fill}
                style={{
                  width: 4,
                  height: 12,
                  backgroundColor: fill,
                  borderWidth: 0.5,
                  borderColor: c.wardStrokes[index],
                  borderRadius: 2,
                  opacity: c.wardFillOpacity,
                }}
              />
            ))}
          </View>
          <T muted size={11}>
            Wards
          </T>
        </View>
      )}
    </View>
  );
}
