import fs from "node:fs";
import path from "node:path";

export const FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
];

export const DEFAULT_AI_MODEL = FALLBACK_MODELS[0];

const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Server-only: check all potential Gemini environment keys across process.env, import.meta.env & dynamic .env read. */
export function getAiApiKey(): string | null {
  const env = typeof process !== "undefined" ? process.env : ({} as any);
  const metaEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : ({} as any);

  let key = (
    env["GEMINI_API_KEY"] ||
    metaEnv["GEMINI_API_KEY"] ||
    env["VITE_GEMINI_API_KEY"] ||
    metaEnv["VITE_GEMINI_API_KEY"] ||
    ""
  ).trim();

  if (!key && typeof process !== "undefined" && typeof fs !== "undefined" && fs.readFileSync) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        const match =
          content.match(/^GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/m) ||
          content.match(/^VITE_GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/m);
        if (match && match[1]) {
          key = match[1].trim();
        }
      }
    } catch {
      /* ignore read failure */
    }
  }

  if (key) {
    key = key.replace(/^["']|["']$/g, "").trim();
  }

  return key || null;
}

/** Validates key format: Google Gemini keys start with "AIzaSy" or "AQ.", Lovable proxy keys start with "sk_". */
export function isValidKeyFormat(key: string): boolean {
  if (!key || !key.trim()) return false;
  return key.startsWith("AIzaSy") || key.startsWith("AQ.") || key.startsWith("sk_");
}

export const INVALID_KEY_MESSAGE =
  "Your GEMINI_API_KEY in .env is missing or invalid. Please check your GEMINI_API_KEY in .env file.";

/** Back-compat alias for older call sites. */
export const getGeminiApiKey = getAiApiKey;

export function normalizeModel(model?: string): string {
  if (!model) return DEFAULT_AI_MODEL;
  let cleaned = model.replace(/^google\//, "").trim();
  if (
    cleaned === "gemini-2.5-flash" ||
    cleaned === "gemini-2.5-flash-lite" ||
    cleaned === "gemini-2.0-flash" ||
    cleaned === "gemini-1.5-pro" ||
    cleaned === "gemini-1.5-flash" ||
    cleaned === "gemini-1.5-flash-8b"
  ) {
    cleaned = "gemini-3.5-flash-lite";
  }
  return cleaned || DEFAULT_AI_MODEL;
}

/** Maps a HTTP failure from AI services to a safe, user-readable message. */
export function describeAiError(status: number, body: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.error?.message ?? parsed?.message ?? parsed?.title ?? "";
  } catch {
    detail = body.slice(0, 200);
  }

  const lower = detail.toLowerCase();
  const rawLower = body.toLowerCase();
  const isKeyError =
    status === 401 ||
    status === 403 ||
    (status === 400 &&
      (lower.includes("key") ||
        rawLower.includes("api_key_invalid") ||
        lower.includes("unauthorized") ||
        lower.includes("prefix")));

  if (isKeyError) {
    return INVALID_KEY_MESSAGE;
  }
  if (status === 404) return `The requested Gemini model is unavailable. ${detail}`;
  if (status === 429) return `The AI service is rate limited. Please try again in a few moments. ${detail}`;
  if (status >= 500) return `The AI service is temporarily unavailable (${status}). Please try again shortly. ${detail}`;
  return `The AI request failed (${status}). ${detail}`;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

interface AiStreamOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}

interface AiJsonOptions {
  system?: string;
  messages?: ChatMessage[];
  userContent?: string | Array<Record<string, unknown>>;
  model?: string;
  temperature?: number;
}

/** Converts ChatMessages into OpenAI chat-completions format (for Gateway). */
function convertOpenAiMessages(messages: ChatMessage[], explicitSystem?: string) {
  const out: Array<Record<string, unknown>> = [];
  if (explicitSystem) out.push({ role: "system", content: explicitSystem });

  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    const parts: Array<Record<string, unknown>> = [];
    for (const item of m.content) {
      if (item.type === "text" && typeof item.text === "string") {
        parts.push({ type: "text", text: item.text });
      } else if (item.type === "image_url" && item.image_url) {
        parts.push({ type: "image_url", image_url: item.image_url });
      } else if (item.type === "file" && item.file && typeof (item.file as { file_data?: string }).file_data === "string") {
        const fileData = (item.file as { file_data: string }).file_data;
        if (/^data:image\//.test(fileData)) {
          parts.push({ type: "image_url", image_url: { url: fileData } });
        }
      }
    }
    if (parts.length > 0) out.push({ role: m.role, content: parts });
  }
  return out;
}

/** Converts ChatMessages, explicit system instructions, and user content into Gemini API format. */
export function formatGeminiPayload(
  messages: ChatMessage[] = [],
  explicitSystem?: string,
  extraUserContent?: string | Array<Record<string, unknown>>
) {
  const systemTexts: string[] = [];
  if (explicitSystem && explicitSystem.trim()) {
    systemTexts.push(explicitSystem.trim());
  }

  const rawContents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = [];

  const processContentParts = (content: string | Array<Record<string, unknown>>) => {
    const parts: Array<Record<string, unknown>> = [];
    if (typeof content === "string") {
      if (content.trim()) {
        parts.push({ text: content });
      }
    } else if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === "text" && typeof item.text === "string" && item.text) {
          parts.push({ text: item.text });
        } else if (item.type === "image_url" && item.image_url) {
          const urlStr = typeof item.image_url === "string" ? item.image_url : (item.image_url as any)?.url;
          if (typeof urlStr === "string") {
            const match = urlStr.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
            }
          }
        } else if (item.type === "file" && item.file) {
          const fileData = (item.file as any)?.file_data;
          if (typeof fileData === "string") {
            const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
            }
          }
        }
      }
    }
    return parts;
  };

  for (const m of messages) {
    if (m.role === "system") {
      if (typeof m.content === "string" && m.content.trim()) {
        systemTexts.push(m.content.trim());
      }
      continue;
    }

    const role: "user" | "model" = m.role === "assistant" ? "model" : "user";
    const parts = processContentParts(m.content);

    if (parts.length > 0) {
      rawContents.push({ role, parts });
    }
  }

  if (extraUserContent) {
    const extraParts = processContentParts(extraUserContent);
    if (extraParts.length > 0) {
      rawContents.push({ role: "user", parts: extraParts });
    }
  }

  // Merge consecutive turns with the same role to ensure valid alternating structure
  const contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = [];
  for (const c of rawContents) {
    const last = contents[contents.length - 1];
    if (last && last.role === c.role) {
      last.parts.push(...c.parts);
    } else {
      contents.push(c);
    }
  }

  const result: {
    system_instruction?: { parts: Array<{ text: string }> };
    contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }>;
  } = { contents };

  if (systemTexts.length > 0) {
    result.system_instruction = {
      parts: [{ text: systemTexts.join("\n\n") }],
    };
  }

  return result;
}

/** Stream chat completions from Gemini API or Gateway */
export async function streamGeminiChat({
  messages,
  model = DEFAULT_AI_MODEL,
  temperature = 0.7,
}: AiStreamOptions): Promise<Response> {
  const key = getAiApiKey();
  if (!key) {
    return new Response(INVALID_KEY_MESSAGE, { status: 401 });
  }

  if (!isValidKeyFormat(key)) {
    return new Response(INVALID_KEY_MESSAGE, { status: 401 });
  }

  const isGatewayKey = key.startsWith("sk_");

  if (isGatewayKey) {
    const openAiPayload = {
      messages: convertOpenAiMessages(messages),
      model: "google/gemini-3.5-flash-lite",
      temperature,
      stream: true,
    };

    try {
      const res = await fetch(LOVABLE_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(openAiPayload),
      });

      if (res.ok && res.body) {
        return new Response(res.body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
          },
        });
      }
      const raw = await res.text().catch(() => "");
      return new Response(describeAiError(res.status, raw), { status: res.status });
    } catch (err) {
      return new Response(err instanceof Error ? err.message : String(err), { status: 500 });
    }
  }

  // Direct Google Gemini API endpoint for AIzaSy... or AQ... keys
  const primaryModel = normalizeModel(model);
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];
  const payload = formatGeminiPayload(messages);

  let lastErrorText = "";
  let lastStatus = 500;

  for (const candidateModel of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:streamGenerateContent?alt=sse&key=${key}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          generationConfig: { temperature },
        }),
      });

      if (res.ok && res.body) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = res.body!.getReader();
            let buf = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const dataStr = trimmed.slice(5).trim();
                  if (!dataStr || dataStr === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const textChunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textChunk) {
                      controller.enqueue(encoder.encode(textChunk));
                    }
                  } catch {
                    /* ignore incomplete json */
                  }
                }
              }
              if (buf.trim().startsWith("data:")) {
                const dataStr = buf.trim().slice(5).trim();
                if (dataStr && dataStr !== "[DONE]") {
                  try {
                    const parsed = JSON.parse(dataStr);
                    const textChunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textChunk) controller.enqueue(encoder.encode(textChunk));
                  } catch { }
                }
              }
            } catch (err) {
              controller.error(err);
              return;
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
          },
        });
      }

      const raw = await res.text().catch(() => "");
      lastStatus = res.status;
      lastErrorText = describeAiError(res.status, raw);
      console.error(`[ai stream] ${candidateModel} -> ${lastErrorText}`);

      if (lastErrorText === INVALID_KEY_MESSAGE || res.status === 401 || res.status === 403) {
        return new Response(lastErrorText, { status: 401 });
      }
    } catch (err) {
      lastErrorText = err instanceof Error ? err.message : String(err);
      console.error(`[ai stream] ${candidateModel} network error: ${lastErrorText}`);
    }
  }

  return new Response(lastErrorText || "The AI stream request failed.", { status: lastStatus });
}

/** Requests structured JSON directly from Google Gemini REST API or Gateway */
export async function callGeminiJson<T = Record<string, unknown>>({
  system,
  messages = [],
  userContent,
  model = DEFAULT_AI_MODEL,
  temperature = 0.2,
}: AiJsonOptions): Promise<T> {
  const key = getAiApiKey();
  if (!key || !isValidKeyFormat(key)) {
    console.error("[ai] GEMINI_API_KEY is missing or invalid");
    throw new Error(INVALID_KEY_MESSAGE);
  }

  const isGatewayKey = key.startsWith("sk_");

  if (isGatewayKey) {
    const allMessages = [...messages];
    if (userContent) allMessages.push({ role: "user", content: userContent });
    const payload = {
      messages: convertOpenAiMessages(allMessages, system),
      model: "google/gemini-3.5-flash-lite",
      temperature,
      response_format: { type: "json_object" },
    };

    const res = await fetch(LOVABLE_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      return JSON.parse(content) as T;
    }
    const raw = await res.text().catch(() => "");
    throw new Error(describeAiError(res.status, raw));
  }

  const primaryModel = normalizeModel(model);
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];
  const payload = formatGeminiPayload(messages, system, userContent);

  let lastErrorText = "";

  for (const candidateModel of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${key}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          generationConfig: {
            response_mime_type: "application/json",
            temperature,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        try {
          return JSON.parse(text) as T;
        } catch {
          const match = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
          if (match) {
            try {
              return JSON.parse(match[0]) as T;
            } catch {
              /* ignore */
            }
          }
          throw new Error("The Gemini API returned a response that was not valid JSON.");
        }
      }

      const text = await res.text().catch(() => "");
      lastErrorText = describeAiError(res.status, text);
      console.error(`[ai json] ${candidateModel} -> ${lastErrorText}`);

      if (lastErrorText === INVALID_KEY_MESSAGE || res.status === 401 || res.status === 403) {
        throw new Error(lastErrorText);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("GEMINI_API_KEY")) {
        throw err;
      }
      lastErrorText = err instanceof Error ? err.message : String(err);
      console.error(`[ai json] ${candidateModel} error: ${lastErrorText}`);
    }
  }

  throw new Error(lastErrorText || "The AI request failed.");
}

