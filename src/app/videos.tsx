import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { CirclePlay, Clock, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton, Row, Screen, T } from "../components/ui";
import { tools, toolVideos, type ToolVideo } from "../config/toolVideos";
import { fonts, useTheme } from "../theme";

/** Tutorial videos for the reusable tools; the list lives in src/config/toolVideos.ts. */
export default function Videos() {
  const c = useTheme(),
    [message, setMessage] = useState("");
  const close = () =>
    router.canGoBack() ? router.back() : router.replace("/");
  async function watch(video: ToolVideo) {
    if (!video.url) return;
    setMessage("");
    try {
      await WebBrowser.openBrowserAsync(video.url);
    } catch {
      setMessage("Couldn’t open the video. Check your internet connection.");
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <Screen style={{ gap: 22 }}>
        <Row>
          <T heading size={27} style={{ flex: 1 }}>
            Reusable tools videos
          </T>
          <IconButton icon={X} label="Close" onPress={close} />
        </Row>
        <T muted size={14}>
          Step-by-step videos for the tools City staff use to update the
          rankings. The tools create the results file you import into this app.
        </T>
        {!!message && (
          <T size={13} accessibilityLiveRegion="polite">
            {message}
          </T>
        )}
        {tools.map((tool) => {
          const videos = toolVideos.filter((v) => v.tool === tool.id);
          if (!videos.length) return null;
          return (
            <View key={tool.id} style={{ gap: 8 }}>
              <Row style={{ justifyContent: "flex-start", gap: 8 }}>
                <T heading size={19}>
                  {tool.name}
                </T>
                {tool.inDevelopment && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: c.chipTint,
                    }}
                  >
                    <T
                      size={11}
                      style={{ fontFamily: fonts.bold, color: c.primaryDeep }}
                    >
                      In development
                    </T>
                  </View>
                )}
              </Row>
              <T muted size={13}>
                {tool.about}
              </T>
              <View
                style={{
                  backgroundColor: c.dataSurface,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                }}
              >
                {videos.map((video, i) => (
                  <VideoRow
                    key={video.id}
                    video={video}
                    divider={i > 0}
                    onPress={() => watch(video)}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </Screen>
    </SafeAreaView>
  );
}

function VideoRow({
  video,
  divider,
  onPress,
}: {
  video: ToolVideo;
  divider: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  const ready = Boolean(video.url);
  return (
    <Pressable
      accessibilityRole={ready ? "link" : undefined}
      accessibilityLabel={`${video.title}. ${ready ? "Watch video" : "Video coming soon"}`}
      disabled={!ready}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 72,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: divider ? 1 : 0,
        borderColor: c.divider,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: ready ? c.primary : c.surface,
        }}
      >
        {ready ? (
          <CirclePlay size={22} color={c.onPrimary} />
        ) : (
          <Clock size={20} color={c.muted} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T size={14} style={{ fontFamily: fonts.bold }}>
          {video.title}
        </T>
        <T muted size={12}>
          {video.description}
        </T>
        <T
          size={11}
          style={{
            fontFamily: fonts.bold,
            color: ready ? c.primaryText : c.muted,
          }}
        >
          {ready
            ? `Watch${video.length ? ` · ${video.length}` : ""}`
            : "Video coming soon"}
        </T>
      </View>
    </Pressable>
  );
}
