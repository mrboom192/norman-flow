import { View } from "react-native";
import { useTheme } from "../theme";
import { T } from "./ui";

export function SegmentLengthLegend() {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {[
        ["< 1 mi", c.segmentShort],
        ["1 mi", c.segmentOneMile],
        ["> 1 mi", c.segmentLong],
      ].map(([label, color]) => (
        <View
          key={label}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <View style={{ width: 12, height: 3, backgroundColor: color }} />
          <T muted size={11}>
            {label}
          </T>
        </View>
      ))}
    </View>
  );
}
