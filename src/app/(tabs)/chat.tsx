import { useLocalSearchParams } from "expo-router";
import {
  ArrowUp,
  ArrowUpRight,
  Bot,
  FileText,
  RotateCcw,
  Sparkles,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { answerQuestion } from "../../analysis/chat";
import { useTourTarget } from "../../components/tourTargets";
import { Input, Row, T } from "../../components/ui";
import { faqs, faqTopics, type FaqTopic } from "../../config/faq";
import { useFlow } from "../../store/useFlow";
import { colors, fonts, useTheme } from "../../theme";

type Message = { role: "bot" | "user"; text: string; source?: string };
const greeting: Message = {
  role: "bot",
  text: "Hi! Ask me about the data — where it came from, how the rankings work, or how to add new files. I answer offline from this app’s content.",
};

export default function Chat() {
  const c = useTheme(),
    results = useFlow((s) => s.results),
    ward = useFlow((s) => s.ward),
    params = useLocalSearchParams<{ question?: string }>(),
    [draft, setDraft] = useState(""),
    [topic, setTopic] = useState<FaqTopic>("Rankings"),
    [messages, setMessages] = useState<Message[]>([greeting]),
    scroll = useRef<React.ComponentRef<typeof ScrollView>>(null),
    last = useRef("");
  const inputTarget = useTourTarget("chat-input");
  // Questions answered from the loaded analysis, so they always have real results.
  const dataQuestions = useMemo(() => {
    const top = results?.wards[ward]?.combined[0];
    return [
      `What’s #1 in Ward ${ward}?`,
      ...(top
        ? [`How many collisions on ${top.road} segment ${top.index}?`]
        : []),
    ];
  }, [results, ward]);
  const asked = new Set(
    messages.filter((m) => m.role === "user").map((m) => m.text),
  );
  const nextQuestions = [
    ...dataQuestions,
    ...faqs.map((f) => f.question),
  ].filter((q) => !asked.has(q));
  const started = messages.length > 1;

  function send(text: string) {
    const question = text.trim();
    if (!question) return;
    setMessages((m) => [
      ...m,
      { role: "user", text: question },
      { role: "bot", ...answerQuestion(question, results) },
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
      <Row style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
        <Row style={{ flex: 1, justifyContent: "flex-start", gap: 12 }}>
          <View
            style={{
              height: 44,
              width: 44,
              borderRadius: 14,
              backgroundColor: colors.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bot color={colors.white} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <T heading size={28}>
              Chatbot
            </T>
            <T muted size={12}>
              Offline · answers from this analysis
            </T>
          </View>
        </Row>
        {started && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
            onPress={() => setMessages([greeting])}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: c.dataSurface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <RotateCcw size={19} color={c.ink} />
          </Pressable>
        )}
      </Row>

      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 16,
          gap: 12,
          flexGrow: 1,
        }}
        onContentSizeChange={() =>
          started && scroll.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}

        {!started && (
          <View style={{ gap: 12, marginTop: 8 }}>
            <Row style={{ justifyContent: "flex-start", gap: 6 }}>
              <Sparkles size={16} color={c.ink} />
              <T heading size={17}>
                From your data
              </T>
            </Row>
            {dataQuestions.map((q) => (
              <QuestionRow key={q} question={q} onPress={() => send(q)} />
            ))}
            <T heading size={17} style={{ marginTop: 8 }}>
              Common questions
            </T>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {faqTopics.map((t) => {
                const active = t === topic;
                return (
                  <Pressable
                    key={t}
                    accessibilityRole="button"
                    accessibilityLabel={`${t} questions`}
                    accessibilityState={{ selected: active }}
                    onPress={() => setTopic(t)}
                    style={{
                      minHeight: 40,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      justifyContent: "center",
                      backgroundColor: active ? c.primary : c.dataSurface,
                    }}
                  >
                    <T
                      size={13}
                      style={{
                        fontFamily: fonts.bold,
                        color: active ? c.onPrimary : c.muted,
                      }}
                    >
                      {t}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View>
              {faqs
                .filter((f) => f.topic === topic)
                .map((f, i) => (
                  <QuestionRow
                    key={f.question}
                    question={f.question}
                    divider={i > 0}
                    flat
                    onPress={() => send(f.question)}
                  />
                ))}
            </View>
          </View>
        )}
      </ScrollView>

      {started && nextQuestions.length > 0 && (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            gap: 8,
            paddingHorizontal: 20,
            paddingBottom: 10,
          }}
        >
          {nextQuestions.slice(0, 8).map((q) => (
            <Pressable
              key={q}
              accessibilityRole="button"
              onPress={() => send(q)}
              style={({ pressed }) => ({
                minHeight: 40,
                paddingHorizontal: 14,
                borderRadius: 999,
                justifyContent: "center",
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <T size={12} style={{ fontFamily: fonts.medium }}>
                {q}
              </T>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View {...inputTarget}>
        <Row
          style={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 12,
            gap: 10,
            borderTopWidth: 1,
            borderColor: c.divider,
          }}
        >
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about the data…"
            style={{
              flex: 1,
              borderWidth: 0,
              backgroundColor: c.dataSurface,
            }}
            onSubmitEditing={() => send(draft)}
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !draft.trim() }}
            disabled={!draft.trim()}
            onPress={() => send(draft)}
            style={({ pressed }) => ({
              width: 50,
              height: 50,
              borderRadius: 25,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: draft.trim() ? c.primary : c.dataSurface,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <ArrowUp size={21} color={draft.trim() ? c.onPrimary : c.muted} />
          </Pressable>
        </Row>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message: m }: { message: Message }) {
  const c = useTheme();
  const user = m.role === "user";
  return (
    <View
      style={{
        alignSelf: user ? "flex-end" : "flex-start",
        maxWidth: "86%",
        gap: 6,
      }}
    >
      <View
        style={{
          paddingHorizontal: 15,
          paddingVertical: 12,
          borderRadius: 22,
          borderBottomLeftRadius: user ? 22 : 6,
          borderBottomRightRadius: user ? 6 : 22,
          backgroundColor: user ? c.primary : c.dataSurface,
        }}
      >
        <T
          size={14}
          style={{ color: user ? c.onPrimary : c.ink, lineHeight: 20 }}
        >
          {m.text}
        </T>
      </View>
      {m.source && (
        <Row
          style={{
            justifyContent: "flex-start",
            gap: 10,
            padding: 12,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: c.dataSurface,
            }}
          >
            <FileText size={17} color={c.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <T size={13} style={{ fontFamily: fonts.bold }}>
              {m.source}
            </T>
            <T muted size={11}>
              Capacity table in Menu · PDF coming soon
            </T>
          </View>
        </Row>
      )}
    </View>
  );
}

function QuestionRow({
  question,
  onPress,
  divider = false,
  flat = false,
}: {
  question: string;
  onPress: () => void;
  divider?: boolean;
  flat?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ask: ${question}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: flat ? 52 : 54,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: flat ? 0 : 16,
        borderRadius: flat ? 0 : 18,
        borderTopWidth: divider ? 1 : 0,
        borderColor: c.divider,
        backgroundColor: flat ? "transparent" : c.dataSurface,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <T size={14} style={{ flex: 1, fontFamily: fonts.medium }}>
        {question}
      </T>
      <ArrowUpRight size={18} color={c.muted} />
    </Pressable>
  );
}
