import { createFileRoute } from "@tanstack/react-router";

type Body = {
  image?: string; // data URL or base64
  scan_type?: "camera" | "barcode" | "qr";
  language?: string; // "en" | "hi" | "mr" | "ja"
  hint?: string; // barcode value / QR text
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  ja: "Japanese",
};

function systemPrompt(lang: string) {
  const name = LANG_NAMES[lang] ?? "English";
  return `You are an AI medicine information assistant inside Sahara, a healthcare app for family caregivers.
You will receive a photo of a medicine (strip, bottle, syrup, injection, box), a barcode value, or QR text.
Your job: identify the medicine and explain it in VERY SIMPLE ${name} that anyone can understand.

Return ONLY a valid JSON object (no markdown, no prose) matching this exact shape:
{
  "medicine_name": string,
  "generic_name": string | null,
  "brand_name": string | null,
  "strength": string | null,
  "dosage_form": string | null,
  "manufacturer": string | null,
  "batch_number": string | null,
  "expiry_date": string | null,
  "manufacturing_date": string | null,
  "price": string | null,
  "prescription_required": boolean | null,
  "confidence": number,             // 0-100 recognition confidence
  "raw_text": string | null,        // OCR text you extracted, if any
  "overview": string,               // 1-2 sentence plain-language summary
  "what_is_it": string,             // simple explanation
  "used_for": string[],             // conditions it treats
  "how_it_works": string,
  "how_to_take": string,
  "side_effects": string[],
  "who_should_avoid": string[],
  "warnings": string[],
  "food_interactions": string | null,
  "alcohol_warning": string | null,
  "pregnancy_guidance": string | null,
  "driving_warning": string | null,
  "missed_dose": string | null,
  "overdose": string | null,
  "storage": string,
  "disposal": string | null,
  "doctor_advice": string
}

Rules:
- If you cannot identify the medicine, set medicine_name to "Unknown medicine" and confidence low, but still fill educational fields with a helpful "cannot identify — please consult a pharmacist" message.
- Never invent batch numbers, prices, or expiry dates. Use null if not visible.
- Keep language simple, warm, and reassuring. Short sentences.
- Always include a clear reminder in doctor_advice that this is educational information, not a substitute for professional medical advice.`;
}

export const Route = createFileRoute("/api/scan-medicine")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let body: Body;
        try { body = await request.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }

        const lang = body.language ?? "en";
        const scanType = body.scan_type ?? "camera";

        const userContent: Array<Record<string, unknown>> = [];
        if (body.hint) {
          const label = scanType === "qr" ? "QR code content" : "Barcode value";
          userContent.push({
            type: "text",
            text: `${label}: ${body.hint}\n\nIdentify this medicine and return the JSON described in the system prompt.`,
          });
        } else {
          userContent.push({
            type: "text",
            text: "Identify the medicine shown in this image. Extract any visible text (name, strength, manufacturer, batch, expiry). Then return the JSON described in the system prompt.",
          });
        }
        if (body.image) {
          const url = body.image.startsWith("data:") ? body.image : `data:image/jpeg;base64,${body.image}`;
          userContent.push({ type: "image_url", image_url: { url } });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt(lang) },
              { role: "user", content: userContent },
            ],
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          if (upstream.status === 429) return new Response("Rate limit reached. Please try again shortly.", { status: 429 });
          if (upstream.status === 402) return new Response("AI credits exhausted. Please add credits in Lovable.", { status: 402 });
          return new Response(text || "AI gateway error", { status: upstream.status || 500 });
        }

        const data = await upstream.json();
        const content: string = data?.choices?.[0]?.message?.content ?? "{}";
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(content); }
        catch {
          // try to salvage a JSON block
          const match = content.match(/\{[\s\S]*\}/);
          if (match) { try { parsed = JSON.parse(match[0]); } catch { /* ignore */ } }
        }

        return new Response(JSON.stringify(parsed), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});