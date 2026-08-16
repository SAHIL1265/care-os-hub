import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { dispatchSmsReminder } from "@/lib/appointments.functions";

/** Fires due appointment reminders while the app is open: in-app toast + notification, and SMS when enabled. */
export function ReminderWatcher() {
  const sendSms = useServerFn(dispatchSmsReminder);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId || cancelled) return;

      const { data } = await supabase
        .from("appointment_reminders")
        .select("*")
        .is("sent_at", null)
        .lte("remind_at", new Date().toISOString())
        .order("remind_at");
      if (cancelled || !data?.length) return;

      for (const reminder of data) {
        if (reminder.channel === "sms") {
          try {
            const res = await sendSms({ data: { reminderId: reminder.id } });
            if (!res.sent) {
              await supabase.from("appointment_reminders").update({ sent_at: new Date().toISOString() } as never).eq("id", reminder.id);
            }
          } catch {
            await supabase.from("appointment_reminders").update({ sent_at: new Date().toISOString() } as never).eq("id", reminder.id);
          }
          continue;
        }

        await supabase.from("alerts").insert({
          sender_id: userId,
          receiver_id: userId,
          alert_type: "important",
          priority: "normal",
          message: reminder.message,
        } as never);
        await supabase.from("appointment_reminders").update({ sent_at: new Date().toISOString() } as never).eq("id", reminder.id);
        toast.info("Appointment reminder", { description: reminder.message, duration: 10000 });
      }
    }

    void check();
    const id = setInterval(() => void check(), 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [sendSms]);

  return null;
}