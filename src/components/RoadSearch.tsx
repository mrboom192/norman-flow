import { Clock3, MapPin, Search, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SegmentResult } from "../analysis/types";
import storage from "../store/storage";
import { fonts, useTheme } from "../theme";
import { Input, T } from "./ui";

const historyKey = "map-search-history";
const web = Platform.OS === "web";

export function RoadSearch({
  value,
  segments,
  onChoose,
}: {
  value: string;
  segments: SegmentResult[];
  onChoose: (value: string) => void;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const host = useRef<React.ComponentRef<typeof View>>(null);

  useEffect(() => {
    let active = true;
    storage
      .getItem(historyKey)
      .then((raw) => {
        const saved: unknown = JSON.parse(raw ?? "[]");
        if (active && Array.isArray(saved))
          setRecent((current) =>
            [
              ...new Set([
                ...current,
                ...saved.filter((s): s is string => typeof s === "string"),
              ]),
            ].slice(0, 10),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!web || !open) return;
    const outside = (event: PointerEvent) => {
      const element = host.current as unknown as HTMLElement | null;
      if (!element?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const names = useMemo(
    () => [...new Set(segments.map((s) => s.road))].sort(),
    [segments],
  );
  const term = draft.trim().toLowerCase();
  const options = term
    ? [
        ...names,
        ...Array.from(
          new Set(segments.flatMap((s) => s.wards)),
          (w) => "Ward " + w,
        ),
      ]
        .filter((name) => name.toLowerCase().includes(term))
        .slice(0, 30)
    : recent;
  function choose(name: string) {
    if (name) {
      const next = [
        name,
        ...recent.filter((s) => s.toLowerCase() !== name.toLowerCase()),
      ].slice(0, 10);
      setRecent(next);
      void storage.setItem(historyKey, JSON.stringify(next)).catch(() => {});
    }
    setOpen(false);
    onChoose(name);
  }
  const row = { flexDirection: "row", alignItems: "center", gap: 12 } as const;
  const field = (
    <View style={row}>
      <Input
        autoFocus
        search
        value={draft}
        onChangeText={setDraft}
        placeholder="Find a street or ward"
        returnKeyType="search"
        onSubmitEditing={() =>
          choose(options[0] && term ? options[0] : draft.trim())
        }
        style={{ flex: 1 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close search"
        onPress={() => setOpen(false)}
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X color={c.ink} size={20} />
      </Pressable>
    </View>
  );
  const list = (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={
        web
          ? {
              position: "absolute",
              top: 56,
              left: 0,
              right: 0,
              maxHeight: Math.min(360, height * 0.5),
              backgroundColor: c.surface,
              borderRadius: 18,
              boxShadow: c.floatShadow,
            }
          : { flex: 1 }
      }
      contentContainerStyle={{ padding: 16, gap: 4 }}
    >
      <T heading size={18}>
        {term ? "Matches" : "Recent searches"}
      </T>
      {!options.length && (
        <T muted size={14}>
          {term
            ? "No matching roads or wards."
            : "Your recent searches will appear here."}
        </T>
      )}
      {options.map((name) => {
        const Icon = term ? MapPin : Clock3;
        return (
          <Pressable
            key={name}
            accessibilityRole="button"
            onPress={() => choose(name)}
            style={({ pressed }) => [
              row,
              { minHeight: 52, opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <View
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor: c.dataSurface,
              }}
            >
              <Icon size={18} color={c.muted} />
            </View>
            <T size={14} style={{ flex: 1 }}>
              {name}
            </T>
          </Pressable>
        );
      })}
      {!!value && (
        <Pressable
          accessibilityRole="button"
          onPress={() => choose("")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <T style={{ color: c.primaryText, fontFamily: fonts.bold }}>
            Clear map search
          </T>
        </Pressable>
      )}
    </ScrollView>
  );
  return (
    <View ref={host} style={{ flex: 1, zIndex: 2 }}>
      {web && open ? (
        <>
          {field}
          {list}
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Find a street or ward"
          onPress={() => {
            setDraft("");
            setOpen(true);
          }}
          style={[
            row,
            {
              minHeight: 50,
              borderRadius: 25,
              paddingHorizontal: 16,
              backgroundColor: c.surface,
              boxShadow: c.floatShadow,
            },
          ]}
        >
          <Search size={18} color={c.muted} />
          <T muted={!value} size={14} numberOfLines={1} style={{ flex: 1 }}>
            {value || "Find a street or ward"}
          </T>
        </Pressable>
      )}
      {!web && open && (
        <Modal
          visible
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <View
            style={{
              flex: 1,
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: insets.bottom,
              paddingHorizontal: 12,
              backgroundColor: c.surface,
            }}
          >
            {field}
            {list}
          </View>
        </Modal>
      )}
    </View>
  );
}
