import { router, useLocalSearchParams } from "expo-router";
import { FileText, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { computeStats } from "../../analysis/dataStats";
import { Button, IconButton, Row, Screen, T } from "../../components/ui";
import { dataPages } from "../../config/dataPages";
import {
  acogPdf,
  bundledDataFile,
  openBundledFile,
} from "../../services/bundledFiles";
import { combine, useFlow } from "../../store/useFlow";
import { fonts, useTheme } from "../../theme";

/** A "Data in this analysis" detail page; wording lives in src/config/dataPages.ts. */
export default function DataPage() {
  const c = useTheme(),
    { topic } = useLocalSearchParams<{ topic: string }>(),
    files = useFlow((s) => s.files),
    results = useFlow((s) => s.results),
    [message, setMessage] = useState("");
  const page = dataPages.find((p) => p.id === topic);
  const stats = useMemo(
    () => computeStats(combine(files), results),
    [files, results],
  );
  const close = () =>
    router.canGoBack() ? router.back() : router.replace("/");
  if (!page)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <Screen>
          <T heading size={24}>
            Page not found
          </T>
          <Button label="Back to Home" onPress={close} />
        </Screen>
      </SafeAreaView>
    );
  const sections: [string, string[]][] = [
    ["What it is", [page.whatItIs]],
    ["Where it came from", [page.whereFrom]],
    ["How we used it", page.howUsed],
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <Screen style={{ gap: 22 }}>
        <Row>
          <T heading size={27} style={{ flex: 1 }}>
            {page.title}
          </T>
          <IconButton icon={X} label="Close" onPress={close} />
        </Row>
        {sections.map(([title, paragraphs]) => (
          <View key={title} style={{ gap: 6 }}>
            <T heading size={18}>
              {title}
            </T>
            {paragraphs.map((p) => (
              <T key={p} size={14} style={{ lineHeight: 21 }}>
                {p}
              </T>
            ))}
          </View>
        ))}
        <View style={{ gap: 8 }}>
          <T heading size={18}>
            Key numbers
          </T>
          <View
            style={{
              backgroundColor: c.dataSurface,
              borderRadius: 20,
              paddingHorizontal: 16,
            }}
          >
            {page.keyNumbers.map((k, i) => (
              <Row
                key={k.label}
                style={{
                  minHeight: 46,
                  gap: 12,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: c.divider,
                }}
              >
                <T muted size={13} style={{ flex: 1 }}>
                  {k.label}
                </T>
                <T size={13} style={{ fontFamily: fonts.bold }}>
                  {stats[k.stat] ?? "N/A"}
                </T>
              </Row>
            ))}
          </View>
          <T muted size={11}>
            Counted from the data loaded in the app.
          </T>
        </View>
        <View style={{ gap: 8 }}>
          <T heading size={18}>
            Files
          </T>
          {page.files.map((name) => {
            const file = name === "acog-pdf" ? acogPdf : bundledDataFile(name);
            return file ? (
              <Button
                key={name}
                outline
                icon={FileText}
                label={`Open ${file.label}`}
                onPress={() =>
                  openBundledFile(file).catch((e) =>
                    setMessage(e instanceof Error ? e.message : String(e)),
                  )
                }
              />
            ) : (
              <T key={name} muted size={12}>
                {name}: not included in this build.
              </T>
            );
          })}
          {!!message && <T size={12}>{message}</T>}
        </View>
      </Screen>
    </SafeAreaView>
  );
}
