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
        minHeight: 172,
        borderRadius: 30,
        padding: 20,
        gap: 12,
        backgroundColor,
      }}
    >
      <Icon size={28} strokeWidth={2} color={colors.dataInk} />
      <View style={{ gap: 4 }}>
        <T
          size={14}
          style={{ color: colors.dataMuted, fontFamily: fonts.medium }}
        >
          {label}
        </T>
        <T heading size={36} style={{ color: colors.dataInk }}>
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
