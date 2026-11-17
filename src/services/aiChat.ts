// AI chatbot client. The device only talks to the team's proxy (see proxy/),
// which holds the model API key; no key ever lives in the app.
import { answerQuestion } from "../analysis/chat";
import type { Results } from "../analysis/types";

export type ChatAnswer = {
  text: string;
  /** Files, fields or pages the answer used ("How I got this"). */
  sources?: string[];
  /** "ai" from the model; "basic" from the built-in rule-based answers. */
  mode: "ai" | "basic";
  /** Rule-based source card (e.g. the ACOG table). */
  source?: string;
};

/** The proxy's public URL, e.g. https://norman-flow-chat.<account>.workers.dev/chat */
export const chatProxyUrl = process.env.EXPO_PUBLIC_CHAT_PROXY_URL ?? "";

export async function askChat({
  question,
  history,
  context,
  results,
  timeoutMs = 20000,
  url = chatProxyUrl,
}: {
  question: string;
  history: { role: "user" | "bot"; text: string }[];
  context: string;
  results: Results | null;
  timeoutMs?: number;
  url?: string;
}): Promise<ChatAnswer> {
  const basic = (): ChatAnswer => ({
    ...answerQuestion(question, results),
    mode: "basic",
  });
  if (!url) return basic();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history: history.slice(-6), context }),
      signal: controller.signal,
    });
    if (!response.ok) return basic();
    const body = (await response.json()) as {
      answer?: string;
      sources?: string[];
    };
    if (!body.answer?.trim()) return basic();
    return {
      text: body.answer.trim(),
      sources: body.sources?.filter(Boolean),
      mode: "ai",
    };
  } catch {
    return basic();
  } finally {
    clearTimeout(timer);
  }
}
