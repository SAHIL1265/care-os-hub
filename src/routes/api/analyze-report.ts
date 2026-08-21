import { createFileRoute } from "@tanstack/react-router";
import { callGeminiJson } from "@/lib/ai.server";

type Body = {
  file?: string; // data URL
  mime?: string;
  file_name?: string;
};

const SYSTEM = `You are a medical report explanation assistant inside Sahara, a healthcare app for family caregivers.
You receive a scanned/photographed/PDF medical report (blood test, CBC, lipid, thyroid, diabetes, liver/kidney function, urine, X-ray, CT, MRI, ECG, ultrasound, prescription, discharge summary, etc.).

YOUR JOB
1. Read (OCR) everything visible in the document. Preserve test names, values, units, reference ranges, dates, findings and impressions EXACTLY as printed.
2. Detect the report type.
3. Explain everything in VERY SIMPLE English that a non-medical family caregiver understands.

ABSOLUTE SAFETY RULES
- NEVER invent test results, values, units, dates or reference ranges. If a reference range is not printed on the report, set "reference_range" to "Not stated on report" and use status "Unclear" unless the report itself flags the value.
- NEVER change a value from the original report.
- NEVER give a definitive diagnosis. Describe possibilities generally and always point to a qualified doctor.
- For X-ray/CT/MRI/ECG/ultrasound IMAGES: you may only explain the WRITTEN report text/findings. You must NOT interpret the raw medical image itself as a diagnosis. If only a raw image is present with no readable report text, say so clearly in the summary and set structured_results to an empty array.
- If the image is unreadable/blank/not a medical document, set processing_ok=false and explain why.

Return ONLY a valid JSON object with this exact shape:
{
  "processing_ok": boolean,
  "failure_reason": string | null,
  "report_type": string,
  "is_medical_image": boolean,
  "image_notice": string | null,
  "patient_info": { "name": string | null, "age": string | null, "gender": string | null, "report_date": string | null, "lab_or_hospital": string | null, "doctor": string | null },
  "extracted_text": string,
  "ocr_confidence": number,
  "low_confidence_notice": string | null,
  "structured_results": [
    { "test": string, "result": string, "unit": string | null, "reference_range": string, "status": "Normal" | "High" | "Low" | "Abnormal" | "Needs Attention" | "Unclear", "explanation": string }
  ],
  "findings": string[],
  "ai_summary": string,
  "important_findings": [ { "title": string, "detail": string, "severity": "info" | "attention" | "urgent" } ],
  "simple_explanation": string,
  "doctor_questions": string[],
  "warning_signs": string[],
  "urgent": boolean
}

Keep sentences short and warm. No markdown inside the JSON strings.`;

export const Route = createFileRoute("/api/analyze-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try { body = await request.json(); } catch { return new Response("Invalid request.", { status: 400 }); }
        if (!body.file) return new Response("No file received.", { status: 400 });

        const mime = body.mime || "image/jpeg";
        const dataUrl = body.file.startsWith("data:") ? body.file : `data:${mime};base64,${body.file}`;

        const userContent: Array<Record<string, unknown>> = [
          { type: "text", text: "Read this medical report carefully and return the JSON described in the system prompt. Use only what is actually printed in the document." },
        ];
        if (mime === "application/pdf") {
          userContent.push({ type: "file", file: { filename: body.file_name || "report.pdf", file_data: dataUrl } });
        } else {
          userContent.push({ type: "image_url", image_url: { url: dataUrl } });
        }

        try {
          const parsed = await callGeminiJson<Record<string, unknown>>({
            system: SYSTEM,
            userContent,
          });

          return new Response(JSON.stringify(parsed), { headers: { "Content-Type": "application/json" } });
        } catch (err) {
          const message = err instanceof Error ? err.message : "We couldn't analyze this report right now.";
          return new Response(message, { status: 502 });
        }
      },
    },
  },
});
