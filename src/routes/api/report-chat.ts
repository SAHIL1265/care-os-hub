import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: string; content: string };
type Body = { report?: string; messages?: Msg[] };

const SYSTEM = `You are Sahara's report assistant. You answer questions about ONE specific medical report that is given to you below.

Rules:
- Answer using the report content provided. If the answer is not in the report, say clearly that the report does not contain that information.
- Use the reference range printed in THAT report. Never invent a reference range or a value.
- Explain medical terms in very simple language, short sentences.
- Never give a definitive diagnosis. If asked "what disease do I have", reply: "This report alone cannot confirm a diagnosis. Some results may be associated with different conditions. A qualified healthcare professional should interpret your report together with your symptoms, medical history, and other tests."
- If the report or the user's symptoms suggest an urgent situation, start with a clear line telling them to seek immediate medical care.
- End medical answers with a one-line reminder that this is general information, not medical advice.`;

export const Route = createFileRoute("/api/report-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI service is not configured.", { status: 500 });

        let body: Body;
        try { body = await request.json(); } catch { return new Response("Invalid request.", { status: 400 }); }

        const history = (Array.isArray(body.messages) ? body.messages : [])
          .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content }));

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            stream: true,
            messages: [
              { role: "system", content: `${SYSTEM}\n\n--- REPORT CONTENT ---\n${(body.report ?? "").slice(0, 20000)}` },
              ...history,
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          if (upstream.status === 429) return new Response("Too many requests right now. Please try again in a moment.", { status: 429 });
          if (upstream.status === 402) return new Response("AI credits exhausted. Please add credits in Lovable.", { status: 402 });
          return new Response("We couldn't answer right now. Please try again.", { status: 502 });
        }

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
                  } catch { /* ignore */ }
                }
              }
            } catch (err) { controller.error(err); return; }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
        });
      },
    },
  },
});
