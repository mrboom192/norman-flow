import { ChevronDown, ChevronUp, GripVertical } from "lucide-react-native";
import { useMemo, useState } from "react";
import { PanResponder, Pressable, View } from "react-native";
import {
  type MapLayer,
  mapLayerLabels,
  moveMapLayer,
} from "../analysis/mapLayers";
import { fonts, useTheme } from "../theme";
import { T } from "./ui";

const rowHeight = 52;
type Drag = { index: number; offset: number; target: number };

export function MapLayerOrder({
  order,
  onChange,
}: {
  order: MapLayer[];
  onChange: (order: MapLayer[]) => void;
}) {
  const c = useTheme();
  const [drag, setDrag] = useState<Drag | null>(null);
  const responders = useMemo(
    () =>
      order.map((_, index) => {
        const position = (dy: number): Drag => {
          const offset = Math.max(
            -index * rowHeight,
            Math.min((order.length - 1 - index) * rowHeight, dy),
          );
          return {
            index,
            offset,
            target: index + Math.round(offset / rowHeight),
          };
        };
        return PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onPanResponderGrant: () => setDrag(position(0)),
          onPanResponderMove: (_, { dy }) => setDrag(position(dy)),
          onPanResponderRelease: (_, { dy }) => {
            setDrag(null);
            const next = moveMapLayer(order, index, position(dy).target);
            if (next !== order) onChange(next);
          },
          onPanResponderTerminate: () => setDrag(null),
          onPanResponderTerminationRequest: () => false,
        }).panHandlers;
      }),
    [order, onChange],
  );
  return (
    <View style={{ gap: 8 }}>
      <T heading size={17}>
        Layer order
      </T>
      <T muted size={12}>
        Drag to reorder. Layers at the top draw in front.
      </T>
      <View
        style={{ borderWidth: 1, borderColor: c.divider, borderRadius: 16 }}
      >
        {order.map((layer, index) => {
          const label = mapLayerLabels[layer];
          const lifted = drag?.index === index;
          let offset = 0;
          if (drag) {
            if (lifted) offset = drag.offset;
            else if (index > drag.index && index <= drag.target)
              offset = -rowHeight;
            else if (index < drag.index && index >= drag.target)
              offset = rowHeight;
          }
          return (
            <View
              key={layer}
              style={{
                height: rowHeight,
                flexDirection: "row",
                alignItems: "center",
                paddingRight: 4,
                borderTopWidth: index ? 1 : 0,
                borderColor: c.divider,
                borderRadius: lifted ? 12 : 0,
                backgroundColor: lifted ? c.primaryTint : c.surface,
                zIndex: lifted ? 1 : 0,
                transform: [{ translateY: offset }],
              }}
            >
              <View
                {...responders[index]}
                testID={`drag-layer-${layer}`}
                style={{
                  width: 44,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GripVertical size={18} color={c.muted} />
              </View>
              <T size={13} style={{ flex: 1, fontFamily: fonts.bold }}>
                {label}
              </T>
              {[-1, 1].map((step) => {
                const target = index + step;
                const disabled = target < 0 || target >= order.length;
                const Icon = step === -1 ? ChevronUp : ChevronDown;
                return (
                  <Pressable
                    key={step}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${label} ${step === -1 ? "up" : "down"}`}
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => onChange(moveMapLayer(order, index, target))}
                    style={{
                      width: 44,
                      height: 44,
                      opacity: disabled ? 0.32 : 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={17} color={c.ink} />
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}
