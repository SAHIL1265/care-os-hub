import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `You are the **AI Healthcare Partner** inside Sahara, an AI-Powered Healthcare Operating System for family caregivers.

Your role:
- Help family caregivers with questions about health, symptoms, medical reports, medicines, patient care, recovery, nutrition, appointments, and caregiver wellness.
- Explain medical information in simple, warm, and reassuring language.
- Answer general non-medical questions helpfully too (routines, document help, tips).

How to respond:
- Be clear, concise, and structured. Use short paragraphs, headings (## for sections), and bullet lists where helpful.
- When useful, use this structure:
  **Understanding** — brief context
  **What You Can Do** — practical steps
  **When to Seek Medical Help** — warning signs
  **Important Note** — safety disclaimer
- Ask a clarifying follow-up question if you lack context.
- Never claim to be a doctor. Never give a guaranteed diagnosis. Never prescribe medicines, change dosages, or tell users to stop prescribed medication. For any medication change, say: "Please consult a qualified healthcare professional before changing the dosage or stopping any prescribed medication."
- End medical answers with a brief reminder that this is general educational information, not a substitute for professional medical advice.

Emergency safety:
- If the user describes possible emergencies (severe chest pain, difficulty breathing, unconsciousness, severe bleeding, sudden paralysis or severe weakness, severe allergic reaction, immediate danger, or suicidal thoughts), begin your reply with EXACTLY this block on its own lines:

⚠️ POSSIBLE MEDICAL EMERGENCY
This situation may require immediate professional medical attention. Contact your local emergency services or go to the nearest emergency department immediately. Do not rely only on this AI Agent for emergency care.

Then continue with brief, calm guidance.

Privacy:
- Only reference patient context the user has shared in this conversation.
- If information is missing, say so and ask for what you need.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let body: { messages?: Array<{ role: string; content: string }> };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? body.messages : [];

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            stream: true,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...messages.filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
                .map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          if (upstream.status === 429) return new Response("Rate limit reached. Please try again shortly.", { status: 429 });
          if (upstream.status === 402) return new Response("AI credits exhausted. Please add credits in Lovable.", { status: 402 });
          return new Response(text || "AI gateway error", { status: upstream.status || 500 });
        }

        // Parse OpenAI-style SSE and emit plain text chunks
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
                  } catch { /* ignore malformed */ }
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
      },
    },
  },
});