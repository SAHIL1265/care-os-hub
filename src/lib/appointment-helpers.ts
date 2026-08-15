import type { Database } from "@/integrations/supabase/types";

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentReminder = Database["public"]["Tables"]["appointment_reminders"]["Row"];
export type AiBookingCall = Database["public"]["Tables"]["ai_booking_calls"]["Row"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];
export type ProviderType = Database["public"]["Enums"]["appointment_provider_type"];

export type TranscriptTurn = { speaker: "ai" | "receptionist" | "system"; text: string; at: string };

export type CallSummary = {
  confirmed?: boolean;
  doctor_name?: string | null;
  provider_name?: string | null;
  date?: string | null;
  time?: string | null;
  token_number?: string | null;
  department?: string | null;
  consultation_fee?: string | null;
  location?: string | null;
  special_instructions?: string | null;
  missing_info?: string[];
  notes?: string | null;
};

export const PROVIDER_TYPES: { value: ProviderType; label: string }[] = [
  { value: "doctor", label: "Doctor" },
  { value: "hospital", label: "Hospital" },
  { value: "clinic", label: "Clinic" },
];

export const STATUS_META: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30" },
  confirmed: { label: "Appointment Confirmed", className: "bg-emerald/15 text-emerald border-emerald/30" },
  today: { label: "Today", className: "bg-primary/15 text-primary border-primary/30" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/30" },
  failed: { label: "Not confirmed", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export const REMINDER_PRESETS = [
  { minutes: 1440, label: "24 hours before" },
  { minutes: 720, label: "12 hours before" },
  { minutes: 120, label: "2 hours before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 30, label: "30 minutes before" },
];

export function appointmentDateTime(a: Pick<Appointment, "confirmed_date" | "confirmed_time" | "preferred_date" | "preferred_time">): Date | null {
  const d = a.confirmed_date ?? a.preferred_date;
  if (!d) return null;
  const t = (a.confirmed_time ?? a.preferred_time ?? "09:00:00").slice(0, 8);
  const parsed = new Date(`${d}T${t}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(a: Appointment): string {
  const dt = appointmentDateTime(a);
  if (!dt) return "No date set";
  return dt.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatTime(value?: string | null): string {
  if (!value) return "--:--";
  const [h, m] = value.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function isToday(dt: Date | null): boolean {
  if (!dt) return false;
  const now = new Date();
  return dt.toDateString() === now.toDateString();
}

export function reminderMessage(a: Appointment, minutes: number): string {
  const who = a.doctor_name ? `Dr. ${a.doctor_name.replace(/^dr\.?\s*/i, "")}` : a.provider_name;
  const time = formatTime(a.confirmed_time ?? a.preferred_time);
  if (minutes >= 1440) return `Reminder: You have a doctor's appointment with ${who} tomorrow at ${time}.`;
  return `Your appointment with ${who} is at ${time} today. Please prepare to leave for ${a.provider_name}.`;
}

export function telHref(raw: string): string {
  return `tel:${raw.replace(/[^\d+]/g, "")}`;
}

export function isValidPhone(raw: string): boolean {
  return /^\+?\d{7,15}$/.test(raw.replace(/[^\d+]/g, ""));
}

export function calendarHref(a: Appointment): string {
  const dt = appointmentDateTime(a);
  if (!dt) return "#";
  const end = new Date(dt.getTime() + 30 * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Appointment · ${a.doctor_name || a.provider_name}`,
    dates: `${fmt(dt)}/${fmt(end)}`,
    details: [a.department, a.reason, a.special_instructions, a.token_number ? `Token: ${a.token_number}` : ""].filter(Boolean).join(" · "),
    location: a.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}