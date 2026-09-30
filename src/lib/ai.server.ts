/**
 * Lovable AI Gateway client helper for CareOS AI / Sahara Health OS.
 * Uses the OpenAI-compatible chat completions endpoint with the project-scoped
 * LOVABLE_API_KEY (auto-provisioned, server-only). Includes model fallback and
 * bounded retry for 429 / 5xx spikes.
 */

export const FALLBACK_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-3.1-flash-lite",
];

export const DEFAULT_AI_MODEL = FALLBACK_MODELS[0];

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Server-only: the key must never be exposed via VITE_* (browser bundle). */
export function getAiApiKey(): string | null {
  const key = (process.env["LOVABLE_API_KEY"] || "").trim();
  return key || null;
}

/** Back-compat alias for older call sites. */
export const getGeminiApiKey = getAiApiKey;

/** Maps a gateway HTTP failure to a safe, user-readable message. Never includes the key. */
export function describeAiError(status: number, body: string): string {
  let detail = "";
  try {
    detail = (JSON.parse(body) as { error?: { message?: string } })?.error?.message ?? "";
  } catch {
    detail = body.slice(0, 200);
  }
  if (status === 400) return `The AI request was invalid. ${detail}`;
  if (status === 401) return "The AI service key is missing or invalid on the server.";
  if (status === 402) return `AI credits are exhausted. ${detail}`;
  if (status === 403) return `The AI service denied the request. ${detail}`;
  if (status === 404) return `The AI model is unavailable. ${detail}`;
  if (status === 429) return `The AI service is rate limited. Please wait and try again. ${detail}`;
  if (status >= 500) return `The AI service is temporarily unavailable. Please try again shortly. ${detail}`;
  return `The AI request failed (${status}). ${detail}`;
}

const TERMINAL = (s: number) => s === 400 || s === 401 || s === 402 || s === 403;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Converts ChatMessages into OpenAI chat-completions format.
 * image_url parts pass through; file parts with data URLs become image_url parts.
 */
function convertMessages(messages: ChatMessage[], explicitSystem?: string) {
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

/**
 * Streams chat completions from the Lovable AI Gateway with model fallback on 429/5xx.
 * Returns a plain-text stream Response.
 */
export async function streamGeminiChat({
  messages,
  model = DEFAULT_AI_MODEL,
  temperature = 0.7,
}: AiStreamOptions): Promise<Response> {
  const key = getAiApiKey();
  if (!key) {
    console.error("[ai] LOVABLE_API_KEY secret is not configured");
    return new Response(
      "The AI service is not configured yet: the server AI key is missing.",
      { status: 500 }
    );
  }

  const payload: Record<string, unknown> = {
    messages: convertMessages(messages),
    temperature,
    stream: true,
  };

  const modelsToTry = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
  let lastErrorText = "";
  let lastStatus = 0;

  for (const candidateModel of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const upstream = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({ ...payload, model: candidateModel }),
        });

        if (upstream.ok && upstream.body) {
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
                    if (!dataStr || dataStr === "[DONE]") continue;
                    try {
                      const parsed = JSON.parse(dataStr);
                      const textChunk: string | undefined =
                        parsed?.choices?.[0]?.delta?.content;
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
        lastErrorText = describeAiError(upstream.status, raw);
        console.error(`[ai] ${candidateModel} -> ${lastErrorText}`);
        if (TERMINAL(upstream.status)) {
          return new Response(lastErrorText, { status: upstream.status });
        }
        if ((upstream.status === 429 || upstream.status >= 500) && attempt === 0) {
          await sleep(800);
          continue;
        }
        break;
      } catch (err) {
        lastErrorText = err instanceof Error ? err.message : String(err);
        console.error(`[ai] network error: ${lastErrorText}`);
        await sleep(500);
      }
    }
  }

  return new Response(lastErrorText || "The AI request failed.", { status: lastStatus || 503 });
}

/**
 * Requests structured JSON from the Lovable AI Gateway with retry & fallback on 429/5xx.
 */
export async function callGeminiJson<T = Record<string, unknown>>({
  system,
  messages = [],
  userContent,
  model = DEFAULT_AI_MODEL,
  temperature = 0.2,
}: AiJsonOptions): Promise<T> {
  const key = getAiApiKey();
  if (!key) {
    console.error("[ai] LOVABLE_API_KEY secret is not configured");
    throw new Error("The AI service is not configured yet: the server AI key is missing.");
  }

  const allMessages: ChatMessage[] = [...messages];
  if (userContent) {
    allMessages.push({ role: "user", content: userContent });
  }

  const payload: Record<string, unknown> = {
    messages: convertMessages(allMessages, system),
    temperature,
    response_format: { type: "json_object" },
  };

  const modelsToTry = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
  let lastError = "";

  for (const candidateModel of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({ ...payload, model: candidateModel }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = data.choices?.[0]?.message?.content ?? "";
          try {
            return JSON.parse(content) as T;
          } catch {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              try { return JSON.parse(match[0]) as T; } catch { /* fall through */ }
            }
          }
          lastError = "The AI returned a response that was not valid JSON.";
          console.error(`[ai] ${candidateModel} -> ${lastError}`);
          break;
        }

        const text = await res.text().catch(() => "");
        lastError = describeAiError(res.status, text);
        console.error(`[ai] ${candidateModel} -> ${lastError}`);
        if (TERMINAL(res.status)) throw new AiTerminalError(lastError);

        if ((res.status === 429 || res.status >= 500) && attempt === 0) {
          await sleep(800);
          continue;
        }
        break;
      } catch (err) {
        if (err instanceof AiTerminalError) throw err;
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[ai] network error: ${lastError}`);
        await sleep(500);
      }
    }
  }

  throw new Error(lastError || "The AI request failed.");
}

class AiTerminalError extends Error {}
