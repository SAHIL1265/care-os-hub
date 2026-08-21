import { createFileRoute } from "@tanstack/react-router";
import { streamGeminiChat, type ChatMessage } from "@/lib/ai.server";

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
        let body: Body;
        try { body = await request.json(); } catch { return new Response("Invalid request.", { status: 400 }); }

        const history: ChatMessage[] = (Array.isArray(body.messages) ? body.messages : [])
          .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
          .slice(-20)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        return await streamGeminiChat({
          messages: [
            { role: "system", content: `${SYSTEM}\n\n--- REPORT CONTENT ---\n${(body.report ?? "").slice(0, 20000)}` },
            ...history,
          ],
        });
      },
    },
  },
});
