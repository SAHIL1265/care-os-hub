import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Appointment, CallSummary, TranscriptTurn } from "./appointment-helpers";
import { reminderMessage } from "./appointment-helpers";
import { extractOutcome, nextAgentLine, simulatedReceptionistLine } from "./appointments.server";

type DB = SupabaseClient<Database>;

export async function loadCall(supabase: DB, callId: string) {
  const { data, error } = await supabase.from("ai_booking_calls").select("*").eq("id", callId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Call not found");
  const { data: appt, error: aErr } = await supabase.from("appointments").select("*").eq("id", data.appointment_id).maybeSingle();
  if (aErr) throw new Error(aErr.message);
  if (!appt) throw new Error("Appointment not found");
  return { call: data, appointment: appt as Appointment };
}

function turn(speaker: TranscriptTurn["speaker"], text: string): TranscriptTurn {
  return { speaker, text, at: new Date().toISOString() };
}

/** One rehearsal round-trip: the AI speaks, the simulated reception desk replies. */
export async function runSimulatedTurn(supabase: DB, key: string, callId: string) {
  const { call, appointment } = await loadCall(supabase, callId);
  if (call.status !== "in_progress" && call.status !== "dialing") return { call, done: true };

  const turns = (call.transcript as unknown as TranscriptTurn[]) ?? [];
  const agent = await nextAgentLine(key, appointment, turns);
  const next = [...turns, turn("ai", agent.line)];

  let done = agent.done;
  if (!agent.done) {
    const desk = await simulatedReceptionistLine(key, appointment, next);
    next.push(turn("receptionist", desk.line));
    done = desk.done;
  }
  if (next.length >= 20) done = true;

  const { data, error } = await supabase
    .from("ai_booking_calls")
    .update({ transcript: next as never, status: "in_progress" })
    .eq("id", callId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { call: data, done };
}

export async function finalizeCall(supabase: DB, key: string, callId: string, cancelled = false) {
  const { call, appointment } = await loadCall(supabase, callId);
  const turns = (call.transcript as unknown as TranscriptTurn[]) ?? [];

  let summary: CallSummary = {};
  if (!cancelled && turns.length) summary = await extractOutcome(key, appointment, turns);
  const confirmed = !cancelled && summary.confirmed === true;

  await supabase
    .from("ai_booking_calls")
    .update({
      status: cancelled ? "cancelled" : confirmed ? "completed" : "failed",
      summary: summary as never,
      outcome: cancelled ? "Call cancelled by the user." : confirmed ? "Appointment confirmed by the clinic." : "Appointment could not be confirmed. Please review the call details and try again.",
      ended_at: new Date().toISOString(),
    })
    .eq("id", callId);

  const patch: Record<string, unknown> = {
    status: confirmed ? "confirmed" : cancelled ? appointment.status : "failed",
    booking_source: "ai",
  };
  if (confirmed) {
    if (summary.date) patch.confirmed_date = summary.date;
    if (summary.time) patch.confirmed_time = summary.time.length === 5 ? `${summary.time}:00` : summary.time;
    if (summary.token_number) patch.token_number = String(summary.token_number);
    if (summary.consultation_fee) patch.consultation_fee = String(summary.consultation_fee);
    if (summary.department) patch.department = summary.department;
    if (summary.special_instructions) patch.special_instructions = summary.special_instructions;
    if (summary.doctor_name) patch.doctor_name = summary.doctor_name;
  }
  const { data: updated } = await supabase.from("appointments").update(patch as never).eq("id", appointment.id).select("*").single();

  if (confirmed && updated) await createReminders(supabase, updated as Appointment, [1440, 120]);

  return { confirmed, summary, appointmentId: appointment.id };
}

export async function createReminders(supabase: DB, appointment: Appointment, offsets: number[], smsTo?: string | null) {
  const base = appointment.confirmed_date ?? appointment.preferred_date;
  if (!base) return [];
  const time = (appointment.confirmed_time ?? appointment.preferred_time ?? "09:00:00").slice(0, 8);
  const start = new Date(`${base}T${time}`);
  if (Number.isNaN(start.getTime())) return [];

  await supabase.from("appointment_reminders").delete().eq("appointment_id", appointment.id).is("sent_at", null);

  const rows = offsets.flatMap((minutes) => {
    const remindAt = new Date(start.getTime() - minutes * 60_000).toISOString();
    const message = reminderMessage(appointment, minutes);
    const base_row = { user_id: appointment.user_id, appointment_id: appointment.id, offset_minutes: minutes, message, remind_at: remindAt };
    const list: Array<Record<string, unknown>> = [{ ...base_row, channel: "in_app" }];
    if (smsTo) list.push({ ...base_row, channel: "sms" });
    return list;
  });

  const { data, error } = await supabase.from("appointment_reminders").insert(rows as never).select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}