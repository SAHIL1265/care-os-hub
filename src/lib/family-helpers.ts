export const RELATIONSHIPS = [
  "father","mother","brother","sister","son","daughter","spouse","guardian","doctor","other",
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const AVAILABILITY = [
  { value: "available", label: "Available", color: "bg-emerald text-white", dot: "bg-emerald-500" },
  { value: "busy",      label: "Busy",      color: "bg-destructive text-white", dot: "bg-red-500" },
  { value: "away",      label: "Away",      color: "bg-warning text-white", dot: "bg-amber-500" },
  { value: "offline",   label: "Offline",   color: "bg-muted text-foreground", dot: "bg-gray-400" },
  { value: "dnd",       label: "Do Not Disturb", color: "bg-purple-600 text-white", dot: "bg-purple-500" },
] as const;
export type Availability = (typeof AVAILABILITY)[number]["value"];

export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

export function isValidPhone(raw: string): boolean {
  const p = normalizePhone(raw);
  // E.164-ish: optional +, 7-15 digits
  return /^\+?\d{7,15}$/.test(p);
}

export function formatPhone(raw: string): string {
  const p = normalizePhone(raw);
  if (p.startsWith("+91") && p.length === 13) return `+91 ${p.slice(3,8)} ${p.slice(8)}`;
  return p;
}

export function telHref(raw: string): string {
  return `tel:${normalizePhone(raw)}`;
}

export function availabilityMeta(status: string) {
  return AVAILABILITY.find((a) => a.value === status) ?? AVAILABILITY[0];
}

export function relationshipLabel(r: string) {
  return r.charAt(0).toUpperCase() + r.slice(1);
}

const EMERGENCY_COOLDOWN_MS = 60_000;
const EMERGENCY_KEY = "sahara:emergency:lastSent";
export function canSendEmergency(): { ok: boolean; waitMs: number } {
  if (typeof window === "undefined") return { ok: true, waitMs: 0 };
  const last = Number(localStorage.getItem(EMERGENCY_KEY) || 0);
  const delta = Date.now() - last;
  if (delta < EMERGENCY_COOLDOWN_MS) return { ok: false, waitMs: EMERGENCY_COOLDOWN_MS - delta };
  return { ok: true, waitMs: 0 };
}
export function markEmergencySent() {
  if (typeof window !== "undefined") localStorage.setItem(EMERGENCY_KEY, String(Date.now()));
}