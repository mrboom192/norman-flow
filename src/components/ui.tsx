import { ArrowUpRight, LucideIcon, Search } from "lucide-react-native";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useFlow } from "../store/useFlow";
import { fonts, useTheme } from "../theme";
export function T({
  children,
  muted = false,
  heading = false,
  size = 15,
  style,
  ...props
}: {
  children: React.ReactNode;
  muted?: boolean;
  heading?: boolean;
  size?: number;
  style?: TextStyle;
} & React.ComponentProps<typeof Text>) {
  const c = useTheme();
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: heading ? fonts.heading : fonts.body,
          fontSize: size,
          color: muted ? c.muted : c.ink,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Screen({
  children,
  style,
  scrollRef,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollRef?: React.Ref<React.ComponentRef<typeof ScrollView>>;
}) {
  const c = useTheme();
  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[
        { padding: 20, gap: 16, paddingBottom: 32 },
        style,
      ]}
    >
      {children}
    </ScrollView>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const c = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: 22,
          padding: 18,
          gap: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  outline = false,
  icon: Icon,
  style,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  icon?: LucideIcon;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 46,
          borderRadius: 999,
          paddingHorizontal: 18,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          backgroundColor: outline ? "transparent" : c.primary,
          borderWidth: 1,
          borderColor: outline ? c.border : "transparent",
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {Icon && <Icon size={17} color={outline ? c.ink : c.white} />}
      <T
        size={14}
        style={{
          fontFamily: fonts.bold,
          color: outline ? c.ink : c.white,
          textAlign: "center",
        }}
      >
        {label}
      </T>
    </Pressable>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onPress,
  style,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        {
          height: 46,
          width: 46,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
        },
        style,
      ]}
    >
      <Icon size={20} color={c.ink} strokeWidth={2} />
    </Pressable>
  );
}
export function Input({
  search = false,
  style,
  ...props
}: TextInputProps & { search?: boolean }) {
  const c = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
          paddingHorizontal: 16,
          minHeight: 50,
        },
        style as ViewStyle,
      ]}
    >
      {search && <Search size={18} color={c.muted} />}
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
        placeholderTextColor={c.muted}
        style={
          {
            fontFamily: fonts.body,
            color: c.ink,
            fontSize: 14,
            flex: 1,
            minWidth: 0,
            paddingVertical: 12,
            outlineWidth: 0,
          } as TextStyle
        }
      />
    </View>
  );
}
export function Chip({
  label,
  onPress,
  active = false,
  blue = false,
}: {
  label: string;
  onPress?: () => void;
  active?: boolean;
  blue?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={{
        minHeight: onPress ? 44 : 25,
        justifyContent: "center",
        paddingHorizontal: 11,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: blue ? 0 : 1,
        borderColor: c.border,
        backgroundColor: active ? c.primary : blue ? c.blueTint : c.surface,
      }}
    >
      <T
        size={12}
        style={{
          color: active ? c.white : c.muted,
          fontFamily: fonts.medium,
        }}
      >
        {label}
      </T>
    </Pressable>
  );
}
export function WardPicker() {
  const c = useTheme(),
    ward = useFlow((s) => s.ward),
    set = useFlow((s) => s.set);
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 5 }}
    >
      {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
        <Pressable
          key={n}
          accessibilityRole="button"
          accessibilityLabel={`Ward ${n}`}
          accessibilityState={{ selected: ward === n }}
          onPress={() => set({ ward: n })}
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: ward === n ? "transparent" : c.border,
            backgroundColor: ward === n ? c.primary : c.surface,
          }}
        >
          <T heading size={19} style={{ color: ward === n ? c.white : c.ink }}>
            {n}
          </T>
        </Pressable>
      ))}
    </View>
  );
}
export function StatTile({ value, label }: { value: string; label: string }) {
  const c = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 90,
        height: 90,
        backgroundColor: c.background,
        borderRadius: 14,
        padding: 12,
      }}
    >
      <T heading size={24}>
        {value}
      </T>
      <T muted size={12}>
        {label}
      </T>
    </View>
  );
}
export function Empty({
  title = "Ready when your data is",
  body = "Add the City’s files to calculate road segment rankings.",
  action,
}: {
  title?: string;
  body?: string;
  action?: () => void;
}) {
  const c = useTheme();
  return (
    <View style={{ paddingVertical: 26, alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          backgroundColor: c.primaryTint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ArrowUpRight color={c.primaryText} size={23} />
      </View>
      <T heading size={19} style={{ textAlign: "center" }}>
        {title}
      </T>
      <T muted size={13} style={{ textAlign: "center", maxWidth: 290 }}>
        {body}
      </T>
      {action && <Button label="Add data files" onPress={action} outline />}
    </View>
  );
}
export function Logo({ size = 40 }: { size?: number }) {
  const c = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Rect
        x="2"
        y="2"
        width="92"
        height="92"
        rx="27"
        fill={c.surface}
        stroke={c.border}
        strokeWidth="3"
      />
      <Path
        d="M11 40 Q22 24 34 31 M62 31 Q75 24 85 40"
        fill="none"
        stroke={c.mapBlue}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <Path d="M25 50 L30 36 H65 L72 51 V62 H24 Z" fill={c.primary} />
      <Rect x="36" y="39" width="24" height="11" rx="2" fill={c.white} />
      <Circle cx="33" cy="63" r="7" fill={c.ink} />
      <Circle cx="65" cy="63" r="7" fill={c.ink} />
    </Svg>
  );
}
export const shared = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  grow: { flex: 1 },
  separator: { height: 1 },
});
