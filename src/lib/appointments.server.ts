import type { Appointment, CallSummary, TranscriptTurn } from "./appointment-helpers";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

export function agentSystemPrompt(a: Appointment, simulated: boolean) {
  const facts = [
    `Patient name: ${a.patient_name || "not provided"}`,
    `Doctor requested: ${a.doctor_name || "any available doctor"}`,
    `Hospital/clinic: ${a.provider_name}`,
    `Department/specialty: ${a.department || "not specified"}`,
    `Preferred date: ${a.preferred_date || "not specified"}`,
    `Preferred time: ${a.preferred_time || "not specified"}`,
    `Reason for appointment: ${a.reason || "not provided"}`,
    `Patient contact number: ${a.share_patient_contact && a.patient_contact ? a.patient_contact : "NOT AUTHORIZED to share"}`,
  ].join("\n");

  return `You are "Sahara", an AI appointment assistant placing a phone call to a hospital/clinic reception desk on behalf of a patient.

RULES
- On your very first line, introduce yourself exactly in this spirit: "Hello, I am Sahara, an AI appointment assistant calling on behalf of a patient. I would like to schedule a doctor's appointment."
- Speak naturally, briefly, one short spoken turn at a time. You talk to the RECEPTIONIST, never to the patient.
- ONLY use the authorized facts below. NEVER invent patient details, insurance, symptoms, IDs or contact numbers.
- If asked for information you do not have, say you will have to confirm that with the patient and ask if the booking can proceed without it.
- Never give medical advice. Never disclose more personal information than needed.
- Ask about doctor availability, available slots, and consultation fee. Prefer the patient's preferred slot; if unavailable, ask for the next available slot after that time or on an alternative date and accept a reasonable one.
- Before ending, confirm back: doctor, date, time, token/reference number if any, department, fee and any special instructions.
- Only treat the appointment as booked when the receptionist explicitly confirms it.

AUTHORIZED FACTS
${facts}
${simulated ? "\nNOTE: This run is a rehearsal with a simulated reception desk because no telephony provider is connected. Behave exactly as in a real call." : ""}`;
}

async function gatewayJson(key: string, system: string, user: string): Promise<Record<string, unknown>> {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    return match ? (JSON.parse(match[0]) as Record<string, unknown>) : {};
  }
}

function transcriptText(turns: TranscriptTurn[]) {
  return turns.map((t) => `${t.speaker === "ai" ? "Sahara AI" : t.speaker === "receptionist" ? "Receptionist" : "System"}: ${t.text}`).join("\n") || "(call just connected, nobody has spoken yet)";
}

/** Produce the AI agent's next spoken line given the conversation so far. */
export async function nextAgentLine(key: string, a: Appointment, turns: TranscriptTurn[]): Promise<{ line: string; done: boolean }> {
  const out = await gatewayJson(
    key,
    agentSystemPrompt(a, true),
    `Conversation so far:\n${transcriptText(turns)}\n\nReturn JSON: {"line": "<your next single spoken turn>", "done": <true only if the call is finished and you have said goodbye>}`,
  );
  return { line: String(out.line ?? "").trim() || "Thank you.", done: out.done === true };
}

/** Simulated reception desk, used when no telephony provider is connected. */
export async function simulatedReceptionistLine(key: string, a: Appointment, turns: TranscriptTurn[]): Promise<{ line: string; done: boolean }> {
  const out = await gatewayJson(
    key,
    `You are role-playing a busy but polite hospital receptionist at "${a.provider_name}" during a REHEARSAL of an appointment call. Answer realistically and briefly, one spoken turn.
Behave like a real desk: check availability, offer concrete slots (sometimes the requested one is taken, then offer the next available), state a consultation fee, ask for the patient's name, and when everything is agreed clearly confirm the booking and give a token number and any arrival instructions. Never role-play the caller.`,
    `Conversation so far:\n${transcriptText(turns)}\n\nReturn JSON: {"line": "<your next single spoken turn>", "done": <true if the call is naturally over>}`,
  );
  return { line: String(out.line ?? "").trim() || "Okay.", done: out.done === true };
}

/** Extract a structured booking outcome from the finished conversation. */
export async function extractOutcome(key: string, a: Appointment, turns: TranscriptTurn[]): Promise<CallSummary> {
  const out = await gatewayJson(
    key,
    `You extract the factual outcome of an appointment booking phone call. Use ONLY what the receptionist actually said. Never invent values. Use null for anything not explicitly stated. Set "confirmed" to true ONLY if the receptionist clearly confirmed a booked appointment.`,
    `Requested: doctor ${a.doctor_name || "any"}, at ${a.provider_name}, department ${a.department || "n/a"}, preferred ${a.preferred_date || "n/a"} ${a.preferred_time || ""}.

Transcript:
${transcriptText(turns)}

Return JSON with keys: confirmed (boolean), doctor_name, provider_name, date (YYYY-MM-DD or null), time (HH:MM 24h or null), token_number, department, consultation_fee, location, special_instructions, missing_info (array of strings), notes (one short plain-language sentence).`,
  );
  return out as CallSummary;
}

/* ---------------- Telephony (Twilio via Lovable connector gateway) ---------------- */

export function telephonyConfigured() {
  return Boolean(process.env.TWILIO_API_KEY && process.env.LOVABLE_API_KEY && process.env.TWILIO_FROM_NUMBER);
}

async function twilioForm(path: string, form: Record<string, string>) {
  const res = await fetch(`https://connector-gateway.lovable.dev/twilio${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.TWILIO_API_KEY as string,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Twilio error [${res.status}]: ${text.slice(0, 400)}`);
  return JSON.parse(text) as Record<string, unknown>;
}

export async function placeOutboundCall(to: string, callId: string, origin: string) {
  const data = await twilioForm("/Calls.json", {
    To: to,
    From: process.env.TWILIO_FROM_NUMBER as string,
    Url: `${origin}/api/public/ai-call/${callId}`,
    StatusCallback: `${origin}/api/public/ai-call/${callId}?status=1`,
    StatusCallbackEvent: "completed",
  });
  return String(data.sid ?? "");
}

export async function sendSms(to: string, body: string) {
  if (!telephonyConfigured()) return { sent: false, reason: "telephony_not_configured" as const };
  await twilioForm("/Messages.json", { To: to, From: process.env.TWILIO_FROM_NUMBER as string, Body: body });
  return { sent: true as const };
}