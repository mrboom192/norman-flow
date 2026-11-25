import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";
import type { BasemapType } from "../analysis/mapLayers";
import { useFlow } from "../store/useFlow";
import { fonts, useTheme } from "../theme";
import type { BasemapStatus } from "./GoogleBasemap";
import { BasemapThumb } from "./MapThumbs";
import { Row, T, Toggle } from "./ui";

const types: { type: BasemapType; label: string; body: string }[] = [
  {
    type: "map",
    label: "Map",
    body: "Streets, places and water.",
  },
  {
    type: "satellite",
    label: "Satellite",
    body: "Aerial imagery. Useful for checking lane counts.",
  },
];

/** The map's Basemap settings page: map type and imagery labels. */
export function BasemapSettings({ status }: { status: BasemapStatus }) {
  const c = useTheme();
  const basemap = useFlow((s) => s.basemap);
  const labels = useFlow((s) => s.basemapLabels);
  const set = useFlow((s) => s.set);
  return (
    <View style={{ gap: 14 }}>
      <T heading size={17}>
        Type
      </T>
      <View accessibilityRole="radiogroup" style={{ gap: 4 }}>
        {types.map(({ type, label, body }) => {
          const active = basemap === type;
          return (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${label} basemap`}
              onPress={() => set({ basemap: type })}
              style={({ pressed }) => ({
                minHeight: 72,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  padding: 2,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: active ? c.primary : "transparent",
                }}
              >
                <BasemapThumb type={type} />
              </View>
              <View style={{ flex: 1 }}>
                <T
                  size={15}
                  style={{
                    fontFamily: fonts.bold,
                    color: active ? c.primaryText : c.ink,
                  }}
                >
                  {label}
                </T>
                <T muted size={12}>
                  {body}
                </T>
              </View>
              {active && <Check size={20} color={c.primaryText} />}
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: 1, backgroundColor: c.divider }} />
      <T heading size={17}>
        Details
      </T>
      <Row style={{ minHeight: 56, gap: 12 }}>
        <View style={{ flex: 1, opacity: basemap === "satellite" ? 1 : 0.5 }}>
          <T size={14} style={{ fontFamily: fonts.bold }}>
            Labels on imagery
          </T>
          <T muted size={12}>
            {basemap === "satellite"
              ? "Street, place and border names over the satellite view."
              : "Available with the Satellite type. Map always shows labels."}
          </T>
        </View>
        <Toggle
          accessibilityLabel="Labels on imagery"
          disabled={basemap !== "satellite"}
          value={labels}
          onValueChange={(basemapLabels) => set({ basemapLabels })}
        />
      </Row>
      {status === "unavailable" && (
        <T
          muted
          size={12}
          style={{
            padding: 12,
            borderRadius: 14,
            backgroundColor: c.dataSurface,
          }}
        >
          The basemap isn’t available here, so the map shows Norman’s data
          layers on a plain background. The setting is saved for when it is.
        </T>
      )}
    </View>
  );
}
