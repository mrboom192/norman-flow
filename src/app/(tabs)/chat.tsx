import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ArrowRight, Bot, FileDown } from "lucide-react-native";
import { Chip, IconButton, Input, Row, T } from "../../components/ui";
import { useTheme, colors } from "../../theme";
import { useFlow } from "../../store/useFlow";
import { faqs } from "../../config/faq";
import { answerQuestion } from "../../analysis/chat";
type Message = { role: "bot" | "user"; text: string; source?: string };
export default function Chat() {
  const c = useTheme(),
    results = useFlow((s) => s.results),
    params = useLocalSearchParams<{ question?: string }>(),
    [draft, setDraft] = useState(""),
    [messages, setMessages] = useState<Message[]>([
      {
        role: "bot",
        text: "Hi! Ask me about the data — where it came from, how the rankings work, or how to add new files.",
      },
    ]),
    scroll = useRef<React.ComponentRef<typeof ScrollView>>(null),
    last = useRef("");
  function send(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", text: text.trim() },
      { role: "bot", ...answerQuestion(text, results) },
    ]);
    setDraft("");
  }
  useEffect(() => {
    if (params.question && params.question !== last.current) {
      last.current = params.question;
      setMessages((m) => [
        ...m,
        { role: "user", text: params.question! },
        { role: "bot", ...answerQuestion(params.question!, results) },
      ]);
    }
  }, [params.question, results]);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          padding: 20,
          paddingBottom: 12,
          gap: 10,
          borderBottomWidth: 1,
          borderColor: c.divider,
        }}
      >
        <Row style={{ justifyContent: "flex-start" }}>
          <View
            style={{
              height: 44,
              width: 44,
              borderRadius: 15,
              backgroundColor: colors.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bot color={colors.border} size={23} />
          </View>
          <View style={{ flex: 1 }}>
            <T heading size={25}>
              Chatbot
            </T>
            <T muted size={11}>
              Answers come from the files in this analysis
            </T>
          </View>
        </Row>
        <T muted size={12}>
          FAQ
        </T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {faqs.map((f) => (
            <Chip
              key={f.question}
              label={f.question}
              onPress={() => send(f.question)}
            />
          ))}
        </View>
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 16,
          gap: 10,
          flexGrow: 1,
          justifyContent: "flex-end",
        }}
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((m, i) => (
          <View
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              gap: 6,
            }}
          >
            <View
              style={{
                padding: 14,
                borderRadius: 20,
                borderTopLeftRadius: m.role === "bot" ? 5 : 20,
                borderTopRightRadius: m.role === "user" ? 5 : 20,
                backgroundColor: m.role === "user" ? c.primary : c.surface,
                borderBottomWidth: 1,
                borderColor: c.border,
              }}
            >
              <T
                size={14}
                style={{ color: m.role === "user" ? c.onPrimary : c.ink }}
              >
                {m.text}
              </T>
            </View>
            {m.source && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 15,
                  padding: 14,
                  backgroundColor: c.surface,
                }}
              >
                <Row>
                  <FileDown size={22} color={c.primaryText} />
                  <View style={{ flex: 1 }}>
                    <T size={12}>{m.source}</T>
                    <T muted size={11}>
                      Capacity table in app · PDF coming soon
                    </T>
                  </View>
                </Row>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <Row style={{ padding: 12, borderTopWidth: 1, borderColor: c.divider }}>
        <Input
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about the data…"
          style={{ flex: 1 }}
          onSubmitEditing={() => send(draft)}
          returnKeyType="send"
        />
        <IconButton
          icon={ArrowRight}
          label="Send message"
          onPress={() => send(draft)}
          style={{ height: 50, width: 50, backgroundColor: c.primaryTint }}
        />
      </Row>
    </KeyboardAvoidingView>
  );
}
