// Norman Flow chat proxy (Cloudflare Worker).
//
// The app never holds the model API key: it sends the question plus the data it
// has loaded to this Worker, which adds the key (a Worker secret), applies the
// grounding rules below, calls Google Gemini and returns a short JSON answer.
// Deploy steps: proxy/README.md.

const MODEL = "gemini-2.5-flash";
const MAX_BODY_BYTES = 250_000;
const MAX_QUESTION_CHARS = 500;

// Fixed on the server so a modified app can't change the rules.
const SYSTEM_RULES = `You are the Norman Flow assistant for City of Norman transportation staff.
Answer in plain English, in at most 120 words, using ONLY the DATA provided in the request (rankings, segments, wards, capacities, crash points and the "Data in this analysis" pages).
Rules:
- Quote numbers exactly as they appear in the DATA. Do not round differently, estimate or calculate new statistics unless the DATA states the inputs and the user asks for that arithmetic.
- If the answer is not in the DATA, say you don't have that information in this analysis.
- Do not recommend specific projects, costs, designs or fixes. The app explains rankings; the City makes decisions. If asked for a recommendation, explain what the rankings show instead.
- Ranks use shared ties (1, 1, 3). A segment on a ward line is ranked in each ward it touches.
- If the DATA says a what-if capacity preset or imported/unofficial rankings are active, say which rankings your answer uses.
Return JSON: {"answer": string, "sources": string[]} where sources names the files, fields or pages you used (e.g. "norman_flow_rankings.csv: vc, ward_ranks").`;

function cors(request, env) {
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const origin = request.headers.get("Origin");
  // Native apps send no Origin header; browsers must be on the allow-list.
  const allow = !origin
    ? "*"
    : allowed.includes(origin) || allowed.includes("*")
      ? origin
      : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "POST" || new URL(request.url).pathname !== "/chat")
      return json({ error: "Not found" }, 404, headers);
    if (
      request.headers.get("Origin") &&
      !headers["Access-Control-Allow-Origin"]
    )
      return json({ error: "Origin not allowed" }, 403, headers);
    if (!env.GEMINI_API_KEY)
      return json({ error: "Proxy is missing GEMINI_API_KEY" }, 503, headers);

    // Per-client limit (Cloudflare rate limiting binding; see wrangler.toml).
    if (env.CHAT_LIMITER) {
      const key = request.headers.get("CF-Connecting-IP") ?? "anonymous";
      const { success } = await env.CHAT_LIMITER.limit({ key });
      if (!success) return json({ error: "Rate limited" }, 429, headers);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES)
      return json({ error: "Request too large" }, 413, headers);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON" }, 400, headers);
    }
    const question = String(body.question ?? "").slice(0, MAX_QUESTION_CHARS);
    const context = String(body.context ?? "");
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    if (!question.trim())
      return json({ error: "Empty question" }, 400, headers);

    const contents = [
      ...history.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: String(m.text ?? "").slice(0, 1000) }],
      })),
      {
        role: "user",
        parts: [{ text: `DATA:\n${context}\n\nQUESTION: ${question}` }],
      },
    ];
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_RULES }] },
          contents,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 600,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                answer: { type: "STRING" },
                sources: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: ["answer"],
            },
          },
        }),
      },
    );
    if (upstream.status === 429)
      return json({ error: "Model quota reached" }, 429, headers);
    if (!upstream.ok) return json({ error: "Model error" }, 502, headers);
    const result = await upstream.json();
    const text = (result.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");
    try {
      const parsed = JSON.parse(text);
      return json(
        {
          answer: String(parsed.answer ?? ""),
          sources: Array.isArray(parsed.sources)
            ? parsed.sources.map(String).slice(0, 8)
            : [],
        },
        200,
        headers,
      );
    } catch {
      return json({ answer: text, sources: [] }, 200, headers);
    }
  },
};
