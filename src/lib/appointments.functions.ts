import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startAiBookingCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { appointmentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { telephonyConfigured, placeOutboundCall } = await import("./appointments.server");

    const { data: appt, error } = await supabase.from("appointments").select("*").eq("id", data.appointmentId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!appt) throw new Error("Appointment not found");

    const live = telephonyConfigured();
    const { data: call, error: cErr } = await supabase
      .from("ai_booking_calls")
      .insert({
        user_id: userId,
        appointment_id: appt.id,
        phone_number: appt.contact_number,
        telephony_provider: live ? "twilio" : "simulated",
        status: live ? "dialing" : "in_progress",
      } as never)
      .select("*")
      .single();
    if (cErr) throw new Error(cErr.message);

    if (live) {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const origin = `https://${getRequestHeader("host")}`;
      try {
        const sid = await placeOutboundCall(appt.contact_number, call.id, origin);
        await supabase.from("ai_booking_calls").update({ provider_call_sid: sid } as never).eq("id", call.id);
      } catch (err) {
        await supabase
          .from("ai_booking_calls")
          .update({ status: "failed", error_message: err instanceof Error ? err.message : "Call failed" } as never)
          .eq("id", call.id);
        throw err;
      }
    }

    return { callId: call.id as string, live };
  });

export const advanceAiCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { callId: string }) => input)
  .handler(async ({ data, context }) => {
    const { getGeminiApiKey } = await import("./ai.server");
    const key = getGeminiApiKey();
    if (!key) throw new Error("Missing GEMINI_API_KEY. Please add GEMINI_API_KEY to your .env file.");
    const { runSimulatedTurn } = await import("./appointments-flow.server");
    const { call, done } = await runSimulatedTurn(context.supabase, key, data.callId);
    return { transcript: call.transcript, status: call.status, done };
  });

export const endAiCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { callId: string; cancelled?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { getGeminiApiKey } = await import("./ai.server");
    const key = getGeminiApiKey();
    if (!key) throw new Error("Missing GEMINI_API_KEY. Please add GEMINI_API_KEY to your .env file.");
    const { finalizeCall } = await import("./appointments-flow.server");
    return await finalizeCall(context.supabase, key, data.callId, data.cancelled === true);
  });

export const saveReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { appointmentId: string; offsets: number[]; sms: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { createReminders } = await import("./appointments-flow.server");
    const { data: appt, error } = await context.supabase.from("appointments").select("*").eq("id", data.appointmentId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!appt) throw new Error("Appointment not found");
    const smsTo = data.sms ? appt.patient_contact : null;
    const rows = await createReminders(context.supabase, appt, data.offsets, smsTo);
    return { count: rows.length };
  });

export const dispatchSmsReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reminderId: string }) => input)
  .handler(async ({ data, context }) => {
    const { sendSms } = await import("./appointments.server");
    const { data: reminder } = await context.supabase.from("appointment_reminders").select("*").eq("id", data.reminderId).maybeSingle();
    if (!reminder) throw new Error("Reminder not found");
    const { data: appt } = await context.supabase.from("appointments").select("patient_contact").eq("id", reminder.appointment_id).maybeSingle();
    if (!appt?.patient_contact) return { sent: false, reason: "no_number" };
    const result = await sendSms(appt.patient_contact, reminder.message);
    await context.supabase.from("appointment_reminders").update({ sent_at: new Date().toISOString() } as never).eq("id", reminder.id);
    return result;
  });