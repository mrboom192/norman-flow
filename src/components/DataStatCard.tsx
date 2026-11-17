import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { colors, fonts } from "../theme";
import { T } from "./ui";

export function DataStatCard({
  icon: Icon,
  value,
  label,
  detail,
  backgroundColor,
  onPress,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  detail?: string;
  backgroundColor: string;
  /** Opens this item's detail page. */
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${value}${onPress ? ". Opens details" : ""}`}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        flex: 1,
        minWidth: 0,
        minHeight: 128,
        borderRadius: 24,
        padding: 16,
        gap: 10,
        backgroundColor,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Icon size={22} strokeWidth={2} color={colors.dataInk} />
        {onPress && <ChevronRight size={18} color={colors.dataInk} />}
      </View>
      <View style={{ gap: 4 }}>
        <T
          size={13}
          style={{ color: colors.dataMuted, fontFamily: fonts.medium }}
        >
          {label}
        </T>
        <T heading size={30} style={{ color: colors.dataInk }}>
          {value}
        </T>
        {detail ? (
          <T
            size={11}
            style={{ color: colors.dataMuted, fontFamily: fonts.medium }}
          >
            {detail}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
}
