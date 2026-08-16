import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot, CalendarDays, CalendarPlus, CheckCircle2, Clock, Loader2, MapPin, Pencil, Phone, PhoneCall,
  PhoneOff, Plus, Stethoscope, Trash2, TriangleAlert, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import {
  advanceAiCall, endAiCall, saveReminders, startAiBookingCall,
} from "@/lib/appointments.functions";
import {
  PROVIDER_TYPES, REMINDER_PRESETS, STATUS_META, appointmentDateTime, calendarHref, formatTime,
  isToday, isValidPhone, telHref,
  type Appointment, type CallSummary, type ProviderType, type TranscriptTurn,
} from "@/lib/appointment-helpers";

export const Route = createFileRoute("/_app/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments · Sahara AI Health OS" },
      { name: "description", content: "Save doctors, hospitals and clinics, then let the Sahara AI assistant call reception and book the appointment for you." },
      { property: "og:title", content: "AI Appointment Booking · Sahara" },
      { property: "og:description", content: "AI-assisted appointment booking calls, live call monitoring and automatic reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppointmentsPage,
});

type FormState = {
  provider_type: ProviderType;
  provider_name: string;
  doctor_name: string;
  contact_number: string;
  location: string;
  department: string;
  preferred_date: string;
  preferred_time: string;
  reason: string;
  notes: string;
  patient_name: string;
  patient_contact: string;
  share_patient_contact: boolean;
};

const emptyForm: FormState = {
  provider_type: "doctor", provider_name: "", doctor_name: "", contact_number: "", location: "",
  department: "", preferred_date: "", preferred_time: "", reason: "", notes: "",
  patient_name: "", patient_contact: "", share_patient_contact: false,
};

function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [bookFor, setBookFor] = useState<Appointment | null>(null);
  const [confirmAi, setConfirmAi] = useState<Appointment | null>(null);
  const [remindFor, setRemindFor] = useState<Appointment | null>(null);
  const [deleteFor, setDeleteFor] = useState<Appointment | null>(null);

  const [call, setCall] = useState<{ id: string; appointment: Appointment; live: boolean } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("appointments").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Appointment[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(a: Appointment) {
    setEditing(a);
    setForm({
      provider_type: a.provider_type,
      provider_name: a.provider_name,
      doctor_name: a.doctor_name ?? "",
      contact_number: a.contact_number,
      location: a.location ?? "",
      department: a.department ?? "",
      preferred_date: a.preferred_date ?? "",
      preferred_time: (a.preferred_time ?? "").slice(0, 5),
      reason: a.reason ?? "",
      notes: a.notes ?? "",
      patient_name: a.patient_name ?? "",
      patient_contact: a.patient_contact ?? "",
      share_patient_contact: a.share_patient_contact,
    });
    setFormOpen(true);
  }

  async function submitForm() {
    if (!form.provider_name.trim()) return toast.error("Please enter a doctor, hospital or clinic name.");
    if (!isValidPhone(form.contact_number)) return toast.error("Please enter a valid contact number.");
    setSaving(true);
    const { data: session } = await supabase.auth.getUser();
    const payload = {
      provider_type: form.provider_type,
      provider_name: form.provider_name.trim(),
      doctor_name: form.doctor_name.trim() || null,
      contact_number: form.contact_number.replace(/[^\d+]/g, ""),
      location: form.location.trim() || null,
      department: form.department.trim() || null,
      preferred_date: form.preferred_date || null,
      preferred_time: form.preferred_time ? `${form.preferred_time}:00` : null,
      reason: form.reason.trim() || null,
      notes: form.notes.trim() || null,
      patient_name: form.patient_name.trim() || null,
      patient_contact: form.patient_contact.trim() || null,
      share_patient_contact: form.share_patient_contact,
    };
    const res = editing
      ? await supabase.from("appointments").update(payload as never).eq("id", editing.id)
      : await supabase.from("appointments").insert({ ...payload, user_id: session.user?.id } as never);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Appointment updated" : "Saved to your appointments");
    setFormOpen(false);
    void load();
  }

  async function removeItem(a: Appointment) {
    const { error } = await supabase.from("appointments").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    setDeleteFor(null);
    toast.success("Deleted");
    void load();
  }

  const startCall = useServerFn(startAiBookingCall);

  async function beginAiCall(a: Appointment) {
    setConfirmAi(null);
    try {
      const res = await startCall({ data: { appointmentId: a.id } });
      setCall({ id: res.callId, appointment: a, live: res.live });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the AI call");
    }
  }

  const buckets = {
    upcoming: items.filter((a) => ["pending", "confirmed", "today"].includes(a.status) && (appointmentDateTime(a)?.getTime() ?? Infinity) >= Date.now()),
    today: items.filter((a) => isToday(appointmentDateTime(a)) && a.status !== "cancelled"),
    pending: items.filter((a) => a.status === "pending"),
    ai: items.filter((a) => a.booking_source === "ai"),
    completed: items.filter((a) => a.status === "completed"),
    cancelled: items.filter((a) => a.status === "cancelled" || a.status === "failed"),
    all: items,
  };

  const renderList = (list: Appointment[]) =>
    list.length === 0 ? (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Nothing here yet.</div>
    ) : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => (
          <AppointmentCard
            key={a.id}
            a={a}
            onBook={() => setBookFor(a)}
            onEdit={() => openEdit(a)}
            onDelete={() => setDeleteFor(a)}
            onRemind={() => setRemindFor(a)}
          />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Save your doctors, hospitals and clinics — then let Sahara AI call reception and book for you."
        actions={<Button className="gradient-bg text-white" onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add doctor or hospital</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Upcoming" value={buckets.upcoming.length} icon={CalendarDays} />
        <StatTile label="Today" value={buckets.today.length} icon={Clock} />
        <StatTile label="AI booked" value={buckets.ai.length} icon={Bot} />
        <StatTile label="Pending" value={buckets.pending.length} icon={TriangleAlert} />
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="ai">AI booked</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        {loading ? (
          <div className="flex items-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading appointments…</div>
        ) : (
          (Object.keys(buckets) as Array<keyof typeof buckets>).map((k) => (
            <TabsContent key={k} value={k} className="mt-4">{renderList(buckets[k])}</TabsContent>
          ))
        )}
      </Tabs>

      {/* Add / edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit appointment" : "Add doctor, hospital or clinic"}</DialogTitle>
            <DialogDescription>Sahara only shares the details you enter here during a booking call.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.provider_type} onValueChange={(v) => setForm((f) => ({ ...f, provider_type: v as ProviderType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROVIDER_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Field label="Doctor / hospital / clinic name *" value={form.provider_name} onChange={(v) => setForm((f) => ({ ...f, provider_name: v }))} placeholder="City Care Hospital" />
            <Field label="Doctor name" value={form.doctor_name} onChange={(v) => setForm((f) => ({ ...f, doctor_name: v }))} placeholder="Dr. Anita Rao" />
            <Field label="Contact number *" value={form.contact_number} onChange={(v) => setForm((f) => ({ ...f, contact_number: v }))} placeholder="+91 98765 43210" />
            <Field label="Location / address" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="MG Road, Pune" />
            <Field label="Department / specialty" value={form.department} onChange={(v) => setForm((f) => ({ ...f, department: v }))} placeholder="Cardiology" />
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Preferred date</Label><Input type="date" value={form.preferred_date} onChange={(e) => setForm((f) => ({ ...f, preferred_date: e.target.value }))} /></div>
              <div className="grid gap-1.5"><Label>Preferred time</Label><Input type="time" value={form.preferred_time} onChange={(e) => setForm((f) => ({ ...f, preferred_time: e.target.value }))} /></div>
            </div>
            <Field label="Patient name" value={form.patient_name} onChange={(v) => setForm((f) => ({ ...f, patient_name: v }))} placeholder="Who is the appointment for?" />
            <Field label="Patient contact number" value={form.patient_contact} onChange={(v) => setForm((f) => ({ ...f, patient_contact: v }))} placeholder="Used for SMS reminders" />
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="pr-3">
                <div className="text-sm font-medium">Allow AI to share patient contact number</div>
                <div className="text-xs text-muted-foreground">Only shared with reception if you allow it.</div>
              </div>
              <Switch checked={form.share_patient_contact} onCheckedChange={(v) => setForm((f) => ({ ...f, share_patient_contact: v }))} />
            </div>
            <div className="grid gap-1.5"><Label>Reason for appointment</Label><Textarea rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Follow-up for blood pressure" /></div>
            <div className="grid gap-1.5"><Label>Notes (optional)</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button className="gradient-bg text-white" onClick={submitForm} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book: direct call or AI */}
      <Dialog open={!!bookFor} onOpenChange={(o) => !o && setBookFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book appointment</DialogTitle>
            <DialogDescription>{bookFor?.provider_name} · {bookFor?.contact_number}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <a href={bookFor ? telHref(bookFor.contact_number) : "#"} onClick={() => setBookFor(null)}>
              <div className="flex items-start gap-3 rounded-xl border p-4 transition hover:border-primary hover:bg-primary/5">
                <Phone className="mt-0.5 h-5 w-5 text-primary" />
                <div><div className="font-semibold">Direct call</div><div className="text-xs text-muted-foreground">Opens your phone dialer with the number filled in. You speak to reception yourself.</div></div>
              </div>
            </a>
            <button type="button" className="text-left" onClick={() => { setConfirmAi(bookFor); setBookFor(null); }}>
              <div className="flex items-start gap-3 rounded-xl border p-4 transition hover:border-emerald hover:bg-emerald/5">
                <Bot className="mt-0.5 h-5 w-5 text-emerald" />
                <div><div className="font-semibold">AI book appointment</div><div className="text-xs text-muted-foreground">Sahara AI calls reception, negotiates a slot and books it for you. You just watch.</div></div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI consent */}
      <AlertDialog open={!!confirmAi} onOpenChange={(o) => !o && setConfirmAi(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Let Sahara AI make this call?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>An AI agent will phone <strong>{confirmAi?.provider_name}</strong> at {confirmAi?.contact_number} and speak with the receptionist on your behalf. It will introduce itself as an AI assistant.</p>
                <p>It will share: patient name, doctor, department, preferred date and time{confirmAi?.reason ? ", reason for visit" : ""}{confirmAi?.share_patient_contact ? ", and your contact number" : ""}. Nothing else.</p>
                <p>The appointment is only marked confirmed if reception actually confirms it. You can cancel the call at any time.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmAi && beginAiCall(confirmAi)}>Start AI call</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {call && (
        <AiCallDialog
          callId={call.id}
          appointment={call.appointment}
          live={call.live}
          onClose={() => { setCall(null); void load(); }}
        />
      )}

      {remindFor && <RemindersDialog appointment={remindFor} onClose={() => setRemindFor(null)} />}

      <AlertDialog open={!!deleteFor} onOpenChange={(o) => !o && setDeleteFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this appointment?</AlertDialogTitle>
            <AlertDialogDescription>{deleteFor?.provider_name} will be removed along with its reminders and call history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteFor && removeItem(deleteFor)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function StatTile({ label, value, icon: Icon }: { label: string; value: number; icon: typeof CalendarDays }) {
  return (
    <Card className="glass">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div><div className="text-2xl font-bold leading-none">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
      </CardContent>
    </Card>
  );
}

function AppointmentCard({ a, onBook, onEdit, onDelete, onRemind }: { a: Appointment; onBook: () => void; onEdit: () => void; onDelete: () => void; onRemind: () => void }) {
  const meta = STATUS_META[a.status];
  const dt = appointmentDateTime(a);
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{a.provider_name}</CardTitle>
            <div className="truncate text-xs text-muted-foreground">{a.doctor_name || PROVIDER_TYPES.find((p) => p.value === a.provider_type)?.label}</div>
          </div>
          <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{a.contact_number}</div>
          {a.department && <div className="flex items-center gap-2"><Stethoscope className="h-3.5 w-3.5" />{a.department}</div>}
          {a.location && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{a.location}</div>}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            {dt ? `${dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${formatTime(a.confirmed_time ?? a.preferred_time)}` : "No preferred date set"}
          </div>
          {a.token_number && <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald" />Token {a.token_number}{a.consultation_fee ? ` · Fee ${a.consultation_fee}` : ""}</div>}
          {a.booking_source === "ai" && <div className="flex items-center gap-2"><Bot className="h-3.5 w-3.5 text-emerald" />Booked by Sahara AI</div>}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Button size="sm" className="gradient-bg text-white" onClick={onBook}><CalendarPlus className="mr-1.5 h-4 w-4" />Book</Button>
          <Button size="sm" variant="outline" asChild><a href={telHref(a.contact_number)}><PhoneCall className="mr-1.5 h-4 w-4" />Call</a></Button>
          <Button size="sm" variant="ghost" onClick={onRemind}><Bell className="mr-1.5 h-4 w-4" />Reminders</Button>
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit appointment"><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete appointment"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AiCallDialog({ callId, appointment, live, onClose }: { callId: string; appointment: Appointment; live: boolean; onClose: () => void }) {
  const advance = useServerFn(advanceAiCall);
  const end = useServerFn(endAiCall);
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [status, setStatus] = useState<"connecting" | "talking" | "wrapping" | "done">("connecting");
  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const stopped = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  const finish = useCallback(async (cancelled: boolean) => {
    stopped.current = true;
    setStatus("wrapping");
    try {
      const res = await end({ data: { callId, cancelled } });
      setSummary(res.summary);
      setConfirmed(res.confirmed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not finish the call");
    }
    setStatus("done");
  }, [callId, end]);

  useEffect(() => {
    let active = true;
    async function loop() {
      setStatus("talking");
      if (live) {
        // Twilio drives the conversation; poll the stored transcript instead.
        while (active && !stopped.current) {
          const { data } = await supabase.from("ai_booking_calls").select("transcript,status,summary").eq("id", callId).maybeSingle();
          if (!active) return;
          if (data) {
            setTurns((data.transcript as unknown as TranscriptTurn[]) ?? []);
            if (["completed", "failed", "cancelled"].includes(data.status)) {
              setSummary(data.summary as CallSummary);
              setConfirmed((data.summary as CallSummary)?.confirmed === true);
              setStatus("done");
              return;
            }
          }
          await new Promise((r) => setTimeout(r, 3000));
        }
        return;
      }
      while (active && !stopped.current) {
        try {
          const res = await advance({ data: { callId } });
          if (!active) return;
          setTurns((res.transcript as unknown as TranscriptTurn[]) ?? []);
          if (res.done) { await finish(false); return; }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Call error");
          await finish(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 900));
      }
    }
    void loop();
    return () => { active = false; };
  }, [advance, callId, finish, live]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o && status === "done") onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl" showCloseButton={status === "done"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-emerald" />AI Appointment Call</DialogTitle>
          <DialogDescription>
            {appointment.provider_name} · {appointment.contact_number}
            {appointment.doctor_name ? ` · ${appointment.doctor_name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-medium">
              {status === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald" /> : <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {status === "connecting" && "Dialling reception…"}
              {status === "talking" && "Sahara AI is speaking with the hospital receptionist."}
              {status === "wrapping" && "Wrapping up the call…"}
              {status === "done" && (confirmed ? "Appointment Confirmed" : "Call finished")}
            </span>
            <Badge variant="outline">
              Appointment requested: {appointment.preferred_date ?? "any date"} {formatTime(appointment.preferred_time)}
            </Badge>
          </div>
          {!live && (
            <p className="mt-2 text-xs text-muted-foreground">
              No telephony provider is connected yet, so this is a rehearsal with a simulated reception desk. Connect Twilio to place real outbound calls.
            </p>
          )}
        </div>

        <ScrollArea className="h-64 rounded-xl border p-3">
          <div className="space-y-3">
            {turns.length === 0 && <div className="text-xs text-muted-foreground">Waiting for the line to connect…</div>}
            {turns.map((t, i) => (
              <div key={i} className={t.speaker === "ai" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${t.speaker === "ai" ? "bg-primary/10 text-foreground" : "bg-muted"}`}>
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.speaker === "ai" ? "Sahara AI" : "Receptionist"}
                  </div>
                  {t.text}
                </div>
              </div>
            ))}
            <div ref={bottom} />
          </div>
        </ScrollArea>

        {status === "done" && summary && (
          <div className="space-y-3 rounded-xl border p-4">
            <div className="font-semibold">Appointment Booking Summary</div>
            {confirmed ? (
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                <SummaryRow label="Hospital" value={summary.provider_name ?? appointment.provider_name} />
                <SummaryRow label="Doctor" value={summary.doctor_name ?? appointment.doctor_name} />
                <SummaryRow label="Date" value={summary.date} />
                <SummaryRow label="Time" value={summary.time} />
                <SummaryRow label="Department" value={summary.department} />
                <SummaryRow label="Token" value={summary.token_number} />
                <SummaryRow label="Consultation fee" value={summary.consultation_fee} />
                <SummaryRow label="Instructions" value={summary.special_instructions} />
              </dl>
            ) : (
              <p className="text-sm text-destructive">Appointment could not be confirmed. Please review the call details and try again.</p>
            )}
            {summary.notes && <p className="text-xs text-muted-foreground">{summary.notes}</p>}
            {summary.missing_info?.length ? (
              <p className="text-xs text-warning">Reception asked for: {summary.missing_info.join(", ")}. Add it to the appointment and try again.</p>
            ) : null}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {status !== "done" ? (
            <Button variant="destructive" onClick={() => finish(true)}><PhoneOff className="mr-2 h-4 w-4" />End call</Button>
          ) : (
            <>
              <Button variant="outline" asChild><a href={calendarHref(appointment)} target="_blank" rel="noreferrer">Add to Calendar</a></Button>
              <Button variant="outline" asChild><a href={telHref(appointment.contact_number)}>Call hospital</a></Button>
              <Button className="gradient-bg text-white" onClick={onClose}>View appointment</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}

function RemindersDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const save = useServerFn(saveReminders);
  const [offsets, setOffsets] = useState<number[]>([1440, 120]);
  const [sms, setSms] = useState(Boolean(appointment.patient_contact));
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await save({ data: { appointmentId: appointment.id, offsets, sms } });
      toast.success(`${res.count} reminder${res.count === 1 ? "" : "s"} scheduled`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save reminders");
    }
    setBusy(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment reminders</DialogTitle>
          <DialogDescription>Choose when Sahara should remind you about {appointment.provider_name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {REMINDER_PRESETS.map((p) => (
            <label key={p.minutes} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <Checkbox
                checked={offsets.includes(p.minutes)}
                onCheckedChange={(c) => setOffsets((o) => (c ? [...o, p.minutes] : o.filter((m) => m !== p.minutes)))}
              />
              {p.label}
            </label>
          ))}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Also send an SMS</div>
              <div className="text-xs text-muted-foreground">
                {appointment.patient_contact ? `To ${appointment.patient_contact}` : "Add a patient contact number first"}
              </div>
            </div>
            <Switch checked={sms} disabled={!appointment.patient_contact} onCheckedChange={setSms} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="gradient-bg text-white" onClick={submit} disabled={busy || offsets.length === 0}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save reminders
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

