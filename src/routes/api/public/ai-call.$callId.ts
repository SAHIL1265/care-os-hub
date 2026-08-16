import { createFileRoute } from "@tanstack/react-router";

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string);
}

function twiml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/**
 * Twilio voice webhook for AI appointment calls.
 * Twilio speaks the AI agent's line, then gathers the receptionist's speech and posts it back here.
 */
export const Route = createFileRoute("/api/public/ai-call/$callId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return twiml("<Say>Sorry, this service is unavailable.</Say><Hangup/>");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { loadCall, finalizeCall } = await import("@/lib/appointments-flow.server");
        const { nextAgentLine } = await import("@/lib/appointments.server");

        const url = new URL(request.url);
        const form = await request.formData().catch(() => null);
        const isStatus = url.searchParams.get("status") === "1";
        const callId = params.callId;

        if (isStatus) {
          await finalizeCall(supabaseAdmin, key, callId).catch(() => null);
          return new Response("ok");
        }

        const { call, appointment } = await loadCall(supabaseAdmin, callId);
        if (call.status === "cancelled") return twiml("<Say>Sorry, this call has been cancelled. Goodbye.</Say><Hangup/>");

        const turns = (call.transcript as unknown as Array<{ speaker: string; text: string; at: string }>) ?? [];
        const heard = String(form?.get("SpeechResult") ?? "").trim();
        if (heard) turns.push({ speaker: "receptionist", text: heard, at: new Date().toISOString() });

        const agent = await nextAgentLine(key, appointment, turns as never);
        turns.push({ speaker: "ai", text: agent.line, at: new Date().toISOString() });

        const done = agent.done || turns.length >= 24;
        await supabaseAdmin
          .from("ai_booking_calls")
          .update({ transcript: turns as never, status: done ? "completed" : "in_progress" } as never)
          .eq("id", callId);

        if (done) {
          await finalizeCall(supabaseAdmin, key, callId).catch(() => null);
          return twiml(`<Say>${escapeXml(agent.line)}</Say><Hangup/>`);
        }

        return twiml(
          `<Gather input="speech" speechTimeout="auto" action="${escapeXml(`${url.origin}/api/public/ai-call/${callId}`)}" method="POST"><Say>${escapeXml(agent.line)}</Say></Gather><Redirect method="POST">${escapeXml(`${url.origin}/api/public/ai-call/${callId}`)}</Redirect>`,
        );
      },
    },
  },
});