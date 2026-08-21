/**
 * Native Google Gemini API client helper for CareOS AI / Sahara Health OS.
 * Connects directly to Google Generative Language API using GEMINI_API_KEY.
 */

export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

export function getGeminiApiKey(): string | null {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> })?.env;
  return (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    metaEnv?.GEMINI_API_KEY ||
    metaEnv?.VITE_GEMINI_API_KEY ||
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
 * Streams chat completions from Google Gemini streamGenerateContent endpoint.
 */
export async function streamGeminiChat({
  messages,
  model = DEFAULT_GEMINI_MODEL,
  temperature = 0.7,
}: GeminiStreamOptions): Promise<Response> {
  const key = getGeminiApiKey();
  if (!key) {
    return new Response(
      "GEMINI_API_KEY is not configured. Please add your free Gemini API key from https://aistudio.google.com/ to your .env file.",
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
      return new Response("Google Gemini rate limit reached. Please wait a few moments and try again.", { status: 429 });
    }
    return new Response(`Gemini API Error (${upstream.status}): ${text.slice(0, 300)}`, { status: upstream.status || 500 });
  }

  // Parse Gemini SSE stream chunks
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
              /* ignore partial line */
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

  const allMessages: ChatMessage[] = [...messages];
  if (userContent) {
    if (typeof userContent === "string") {
      allMessages.push({ role: "user", content: userContent });
    } else {
      allMessages.push({ role: "user", content: userContent });
    }
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error("Gemini rate limit exceeded. Please wait a moment and try again.");
    }
    throw new Error(`Gemini API error [${res.status}]: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

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
