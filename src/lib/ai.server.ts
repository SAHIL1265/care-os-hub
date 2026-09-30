/**
 * Native Google Gemini API client helper for CareOS AI / Sahara Health OS.
 * Includes automatic model fallback and exponential retry for 503 / 429 high-demand spikes.
 */

export const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-pro",
];

export const DEFAULT_GEMINI_MODEL = FALLBACK_MODELS[0];

/** Server-only: the key must never be exposed via VITE_* (browser bundle). */
export function getGeminiApiKey(): string | null {
  const key = (process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"] || "").trim();
  return key || null;
}

/** Maps a Gemini HTTP failure to a safe, user-readable message. Never includes the key. */
export function describeGeminiError(status: number, body: string): string {
  let detail = "";
  try {
    detail = (JSON.parse(body) as { error?: { message?: string } })?.error?.message ?? "";
  } catch {
    detail = body.slice(0, 200);
  }
  detail = detail.replace(/key=[^&\s]+/g, "key=***");
  if (status === 400 && /API key/i.test(detail)) return `Gemini rejected the API key (invalid key). ${detail}`;
  if (status === 401) return `Gemini authentication failed. ${detail}`;
  if (status === 403) return `Gemini permission denied (key restricted or API not enabled). ${detail}`;
  if (status === 404) return `Gemini model not found. ${detail}`;
  if (status === 429) return `Gemini quota or rate limit reached. Please wait and try again. ${detail}`;
  if (status >= 500) return `Gemini is temporarily unavailable. Please try again shortly. ${detail}`;
  return `Gemini request failed (${status}). ${detail}`;
}

const TERMINAL = (s: number) => s === 400 || s === 401 || s === 403;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

interface GeminiStreamOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}

interface GeminiJsonOptions {
  system?: string;
  messages?: ChatMessage[];
  userContent?: string | Array<Record<string, unknown>>;
  model?: string;
  temperature?: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Converts standard ChatMessages into Gemini contents array + system instruction.
 */
function convertMessagesToGemini(messages: ChatMessage[], explicitSystem?: string) {
  let systemText = explicitSystem || "";
  const contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = [];

  for (const m of messages) {
    if (m.role === "system") {
      const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      systemText = systemText ? `${systemText}\n\n${text}` : text;
      continue;
    }

    const geminiRole = m.role === "assistant" ? ("model" as const) : ("user" as const);
    const parts: Array<Record<string, unknown>> = [];

    if (typeof m.content === "string") {
      parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      for (const item of m.content) {
        if (item.type === "text" && typeof item.text === "string") {
          parts.push({ text: item.text });
        } else if (item.type === "image_url" && item.image_url && typeof (item.image_url as { url?: string }).url === "string") {
          const url = (item.image_url as { url: string }).url;
          const match = url.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        } else if (item.type === "file" && item.file && typeof (item.file as { file_data?: string }).file_data === "string") {
          const fileData = (item.file as { file_data: string }).file_data;
          const match = fileData.match(/^data:([a-zA-Z0-9/.-]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        }
      }
    }

    if (parts.length > 0) {
      contents.push({ role: geminiRole, parts });
    }
  }

  return { systemText, contents };
}

/**
 * Streams chat completions from Google Gemini with automatic model fallback on 503/429.
 */
export async function streamGeminiChat({
  messages,
  model = DEFAULT_GEMINI_MODEL,
  temperature = 0.7,
}: GeminiStreamOptions): Promise<Response> {
  const key = getGeminiApiKey();
  if (!key) {
    console.error("[gemini] GEMINI_API_KEY secret is not configured");
    return new Response(
      "The AI service is not configured yet: the GEMINI_API_KEY secret is missing on the server.",
      { status: 500 }
    );
  }

  const { systemText, contents } = convertMessagesToGemini(messages);

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
    },
  };
  if (systemText) {
    payload.systemInstruction = { parts: [{ text: systemText }] };
  }

  const modelsToTry = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
  let lastErrorText = "";
  let lastStatus = 0;

  for (const candidateModel of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:streamGenerateContent?alt=sse&key=${key}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const upstream = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (upstream.ok && upstream.body) {
          // Stream successfully established
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              const reader = upstream.body!.getReader();
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
                    if (!dataStr) continue;
                    try {
                      const parsed = JSON.parse(dataStr);
                      const textChunk: string | undefined = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (textChunk) {
                        controller.enqueue(encoder.encode(textChunk));
                      }
                    } catch {
                      /* ignore partial json */
                    }
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

        const raw = await upstream.text().catch(() => "");
        lastStatus = upstream.status;
        lastErrorText = describeGeminiError(upstream.status, raw);
        console.error(`[gemini] ${candidateModel} -> ${lastErrorText}`);
        if (TERMINAL(upstream.status)) {
          return new Response(lastErrorText, { status: upstream.status });
        }
        if ((upstream.status === 503 || upstream.status === 429) && attempt === 0) {
          await sleep(800);
          continue;
        }
        break;
      } catch (err) {
        lastErrorText = err instanceof Error ? err.message : String(err);
        console.error(`[gemini] network error: ${lastErrorText}`);
        await sleep(500);
      }
    }
  }

  return new Response(lastErrorText || "Gemini request failed.", { status: lastStatus || 503 });
}

/**
 * Requests structured JSON from Google Gemini with automatic retry & fallback on 503/429.
 */
export async function callGeminiJson<T = Record<string, unknown>>({
  system,
  messages = [],
  userContent,
  model = DEFAULT_GEMINI_MODEL,
  temperature = 0.2,
}: GeminiJsonOptions): Promise<T> {
  const key = getGeminiApiKey();
  if (!key) {
    console.error("[gemini] GEMINI_API_KEY secret is not configured");
    throw new Error("The AI service is not configured yet: the GEMINI_API_KEY secret is missing on the server.");
  }

  const allMessages: ChatMessage[] = [...messages];
  if (userContent) {
    allMessages.push({ role: "user", content: userContent });
  }

  const { systemText, contents } = convertMessagesToGemini(allMessages, system);

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
    },
  };
  if (systemText) {
    payload.systemInstruction = { parts: [{ text: systemText }] };
  }

  const modelsToTry = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
  let lastError = "";

  for (const candidateModel of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${key}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
          try {
            return JSON.parse(content) as T;
          } catch {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              try { return JSON.parse(match[0]) as T; } catch { /* fall through */ }
            }
          }
          lastError = "Gemini returned a response that was not valid JSON.";
          console.error(`[gemini] ${candidateModel} -> ${lastError}`);
          break;
        }

        const text = await res.text().catch(() => "");
        lastError = describeGeminiError(res.status, text);
        console.error(`[gemini] ${candidateModel} -> ${lastError}`);
        if (TERMINAL(res.status)) throw new GeminiTerminalError(lastError);

        if ((res.status === 503 || res.status === 429) && attempt === 0) {
          await sleep(800);
          continue;
        }
        break;
      } catch (err) {
        if (err instanceof GeminiTerminalError) throw err;
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[gemini] network error: ${lastError}`);
        await sleep(500);
      }
    }
  }

  throw new Error(lastError || "Gemini request failed.");
}

class GeminiTerminalError extends Error {}
