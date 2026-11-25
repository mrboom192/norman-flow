import { ChevronUp, MapPin, Map as MapIcon } from "lucide-react-native";
import { type ReactNode, useEffect, useState } from "react";
import { Animated, Easing, Platform, Pressable, View } from "react-native";
import { fonts, useTheme } from "../theme";
import { T } from "./ui";

const native = Platform.OS !== "web";

/**
 * A pill button at the bottom right of the map that grows into a card.
 * The card animates from the button's corner and shrinks back on close.
 */
export function CollapsibleCard({
  open,
  onOpen,
  label,
  selected,
  children,
}: {
  open: boolean;
  onOpen: () => void;
  label: string;
  /** A road is selected: the button shows its name. */
  selected: boolean;
  children: ReactNode;
}) {
  const c = useTheme();
  const [progress] = useState(() => new Animated.Value(open ? 1 : 0));
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? 240 : 180,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: native,
    }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, progress]);
  const Icon = selected ? MapPin : MapIcon;
  return (
    <>
      {mounted && (
        <Animated.View
          accessibilityViewIsModal={false}
          style={{
            alignSelf: "stretch",
            backgroundColor: c.surface,
            borderRadius: 24,
            padding: 16,
            gap: 12,
            boxShadow: c.floatShadow,
            opacity: progress,
            transformOrigin: "bottom right",
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
              },
            ],
          }}
        >
          {children}
        </Animated.View>
      )}
      {!mounted && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            selected ? `Show details for ${label}` : "Show map details"
          }
          accessibilityState={{ expanded: false }}
          onPress={onOpen}
          style={({ pressed }) => ({
            maxWidth: "75%",
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingLeft: 14,
            paddingRight: 12,
            borderRadius: 999,
            backgroundColor: c.surface,
            boxShadow: c.floatShadow,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? c.primary : c.dataSurface,
            }}
          >
            <Icon size={14} color={selected ? c.onPrimary : c.ink} />
          </View>
          <T
            size={14}
            numberOfLines={1}
            style={{ flexShrink: 1, fontFamily: fonts.bold }}
          >
            {label}
          </T>
          <ChevronUp size={18} color={c.muted} />
        </Pressable>
      )}
    </>
  );
}
