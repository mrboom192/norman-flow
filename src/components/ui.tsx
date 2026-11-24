import { ArrowUpRight, LucideIcon, Search } from "lucide-react-native";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Switch,
  SwitchProps,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { desktopContentWidth, useDesktopLayout } from "./desktopLayout";
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
  wide = false,
  backgroundColor,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollRef?: React.Ref<React.ComponentRef<typeof ScrollView>>;
  wide?: boolean;
  backgroundColor?: string;
}) {
  const c = useTheme();
  const desktop = useDesktopLayout();
  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: backgroundColor ?? c.background }}
      contentContainerStyle={[
        { padding: 20, gap: 16, paddingBottom: 32 },
        desktop && {
          width: "100%",
          maxWidth: wide ? desktopContentWidth : 760,
          alignSelf: "center",
          padding: 28,
          paddingBottom: 36,
        },
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
  danger = false,
  icon: Icon,
  style,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  /** Red, for actions that delete or reset data. */
  danger?: boolean;
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
          backgroundColor: outline
            ? "transparent"
            : danger
              ? c.danger
              : c.primary,
          borderWidth: 1,
          borderColor: outline ? c.border : "transparent",
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {Icon && (
        <Icon
          size={17}
          color={outline ? c.ink : danger ? c.onDanger : c.onPrimary}
        />
      )}
      <T
        size={14}
        style={{
          fontFamily: fonts.bold,
          color: outline ? c.ink : danger ? c.onDanger : c.onPrimary,
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
  const [focused, setFocused] = React.useState(false);
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: focused ? c.primaryText : c.border,
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
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
        placeholderTextColor={c.muted}
        style={
          {
            fontFamily: fonts.body,
            color: c.ink,
            fontSize: Platform.OS === "web" ? 16 : 14,
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
          color: active ? c.onPrimary : c.muted,
          fontFamily: fonts.medium,
        }}
      >
        {label}
      </T>
    </Pressable>
  );
}
export function WardPicker({
  all = false,
  onSelectWard,
}: {
  all?: boolean;
  onSelectWard?: () => void;
} = {}) {
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
          accessibilityState={{ selected: !all && ward === n }}
          onPress={() => {
            set({ ward: n });
            onSelectWard?.();
          }}
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: !all && ward === n ? "transparent" : c.border,
            backgroundColor: !all && ward === n ? c.primary : c.surface,
          }}
        >
          <T
            heading
            size={19}
            style={{ color: !all && ward === n ? c.onPrimary : c.ink }}
          >
            {n}
          </T>
        </Pressable>
      ))}
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
/** Switch with a visible off-state track so it lines up with row edges on every platform. */
export function Toggle(props: SwitchProps) {
  const c = useTheme();
  return (
    <Switch
      trackColor={{ false: c.border, true: c.primary }}
      thumbColor={c.white}
      ios_backgroundColor={c.border}
      {...props}
    />
  );
}
export function FileBadge({ label }: { label: string }) {
  const c = useTheme();
  return (
    <View
      style={{
        width: 44,
        height: 40,
        borderRadius: 11,
        paddingHorizontal: 3,
        backgroundColor: c.primaryTint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <T
        size={label.length > 4 ? 8 : 10}
        style={{
          fontFamily: fonts.bold,
          color: c.primaryDeep,
          letterSpacing: label.length > 4 ? -0.3 : 0,
        }}
      >
        {label}
      </T>
    </View>
  );
}
