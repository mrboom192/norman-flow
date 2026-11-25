import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DataLayers } from "../components/DataLayers";
import { IconButton, Row, T } from "../components/ui";
import { useFlow } from "../store/useFlow";
import { useTheme } from "../theme";

/** Data layers as its own page on phones (desktop shows it in a sheet). */
export default function LayersScreen() {
  const c = useTheme();
  const [dragging, setDragging] = useState(false);
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/search");
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <Row
        style={{
          justifyContent: "flex-start",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <IconButton icon={ArrowLeft} label="Back to map" onPress={back} />
        <T heading size={26}>
          Data layers
        </T>
      </Row>
      <ScrollView
        // Dragging a layer must move the layer, not the page.
        scrollEnabled={!dragging}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 40,
        }}
      >
        <DataLayers
          desktop={false}
          onDragging={setDragging}
          onSelect={(id) => {
            useFlow.getState().set({ selected: id });
            back();
          }}
          onAddFiles={() => router.push("/import")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
