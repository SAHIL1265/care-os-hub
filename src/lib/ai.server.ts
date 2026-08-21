/**
 * Server-side Google Gemini client helper for CareOS AI / Sahara Health OS.
 * Uses official Google Gemini API (https://generativelanguage.googleapis.com/v1beta/openai/chat/completions)
 * with free-tier support via GEMINI_API_KEY.
 */

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function getGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    null
  );
}

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

/**
 * Streams chat completions using Google Gemini's OpenAI-compatible endpoint.
 * Returns a Response with text/plain chunk stream.
 */
export async function streamGeminiChat({
  messages,
  model = DEFAULT_GEMINI_MODEL,
  temperature = 0.7,
}: GeminiStreamOptions): Promise<Response> {
  const key = getGeminiApiKey();
  if (!key) {
    return new Response(
      "GEMINI_API_KEY is not configured. Please add your free Gemini API key from https://aistudio.google.com/ to .env file.",
      { status: 500 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(GEMINI_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        temperature,
        messages,
      }),
    });
  } catch (err) {
    return new Response(
      `Failed to connect to Google Gemini API: ${err instanceof Error ? err.message : String(err)}`,
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    if (upstream.status === 429) {
      return new Response(
        "Google Gemini rate limit reached. Please wait a few moments and try again.",
        { status: 429 }
      );
    }
    if (upstream.status === 400 || upstream.status === 403 || upstream.status === 401) {
      return new Response(
        `Gemini API Error (${upstream.status}): Invalid API Key or request parameters. ${text.slice(0, 200)}`,
        { status: upstream.status }
      );
    }
    return new Response(text || "Google Gemini API error", { status: upstream.status || 500 });
  }

  // Parse SSE stream and emit plain text chunks
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
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta: string | undefined = json?.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* ignore malformed chunk */
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

/**
 * Requests structured JSON from Google Gemini.
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
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add your free Gemini API key to .env file."
    );
  }

  const fullMessages: ChatMessage[] = [];
  if (system) {
    fullMessages.push({ role: "system", content: system });
  }
  if (messages.length > 0) {
    fullMessages.push(...messages);
  }
  if (userContent) {
    fullMessages.push({ role: "user", content: userContent });
  }

  const res = await fetch(GEMINI_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: fullMessages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error("Gemini rate limit exceeded. Please wait a moment and try again.");
    }
    throw new Error(`Gemini API error [${res.status}]: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "{}";

  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("Failed to parse JSON response from Gemini.");
  }
}
