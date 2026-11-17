import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { colors, fonts } from "../theme";
import { T } from "./ui";

export function DataStatCard({
  icon: Icon,
  value,
  label,
  detail,
  backgroundColor,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  detail?: string;
  backgroundColor: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 128,
        borderRadius: 24,
        padding: 16,
        gap: 10,
        backgroundColor,
      }}
    >
      <Icon size={22} strokeWidth={2} color={colors.dataInk} />
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
    </View>
  );
}
