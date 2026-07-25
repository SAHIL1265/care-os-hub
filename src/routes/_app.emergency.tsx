import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Ambulance, Phone, MapPin, HeartPulse, Pill, Droplets, AlertTriangle, Users, Siren, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { nearbyHospitals, user, medicines } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { canSendEmergency, formatPhone, markEmergencySent, telHref } from "@/lib/family-helpers";

type FamilyMember = Database["public"]["Tables"]["family_members"]["Row"];

export const Route = createFileRoute("/_app/emergency")({
  head: () => ({ meta: [{ title: "Emergency · Sahara" }] }),
  component: Emergency,
});

function Emergency() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const { data: contacts = [] } = useQuery({
    queryKey: ["emergency_contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("family_members")
        .select("*").eq("is_emergency_contact", true).order("created_at");
      if (error) throw error;
      return data as FamilyMember[];
    },
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState(
    `${user.name} needs immediate assistance. Please respond or call back right away.`,
  );
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ at: Date; recipients: FamilyMember[] } | null>(null);

  async function sendEmergency() {
    if (!userId) { toast.error("Sign in first"); return; }
    if (contacts.length === 0) { toast.error("Add at least one emergency contact first"); return; }
    const gate = canSendEmergency();
    if (!gate.ok) { toast.error(`Please wait ${Math.ceil(gate.waitMs / 1000)}s before sending another alert`); return; }

    setSending(true);
    const rows = contacts.map((c) => ({
      sender_id: userId,
      receiver_id: c.linked_user_id,
      family_member_id: c.id,
      alert_type: "emergency" as const,
      priority: "critical" as const,
      message: message.trim().slice(0, 500),
    }));
    const { error } = await supabase.from("alerts").insert(rows);
    setSending(false);
    if (error) { toast.error(error.message); return; }
    markEmergencySent();
    setLastResult({ at: new Date(), recipients: contacts });
    setConfirmOpen(false);
    toast.success(`Emergency alert sent to ${contacts.length} contact${contacts.length === 1 ? "" : "s"}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Emergency" subtitle="One tap to alert everyone that matters." />

      <Card className="overflow-hidden border-destructive/40 bg-destructive/5">
        <CardContent className="grid gap-6 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <motion.div
            className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full bg-destructive text-white shadow-elegant"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <motion.span
              className="absolute inset-0 rounded-full bg-destructive/50"
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <AlertTriangle className="relative h-14 w-14" />
          </motion.div>
          <div className="min-w-0">
            <div className="text-2xl font-bold">Activate SOS</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Sends an urgent alert to all {contacts.length} of your emergency contact{contacts.length === 1 ? "" : "s"} and shares your medical profile.
            </p>
            {contacts.length === 0 && (
              <div className="mt-2 text-xs text-destructive">
                No emergency contacts yet — <Link to="/family" className="underline">add one</Link>.
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button asChild size="lg" variant="destructive" className="gap-2">
              <a href="tel:112"><Ambulance className="h-5 w-5" />Call ambulance</a>
            </Button>
            <Button
              size="lg"
              onClick={() => setConfirmOpen(true)}
              disabled={contacts.length === 0}
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Siren className="h-5 w-5" />Send emergency alert
            </Button>
          </div>
        </CardContent>
      </Card>

      {lastResult && (
        <Card className="border-emerald/40 bg-emerald/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald">
              <ShieldAlert className="h-4 w-4" />Emergency alert sent · {lastResult.at.toLocaleTimeString()}
            </div>
            <div className="mt-2 grid gap-1 text-sm">
              {lastResult.recipients.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border bg-background p-2">
                  <span>✓ {r.name} <span className="text-muted-foreground">({formatPhone(r.phone_number)})</span></span>
                  <Button asChild size="sm" variant="ghost"><a href={telHref(r.phone_number)}><Phone className="h-3.5 w-3.5" /></a></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Medical profile</CardTitle><CardDescription>Shared with responders</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><Droplets className="h-4 w-4 text-destructive" /><span className="font-semibold">Blood group:</span>{user.bloodGroup}</div>
            <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 text-warning" /><span><span className="font-semibold">Allergies:</span> {user.allergies.join(", ")}</span></div>
            <div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-primary" /><span className="font-semibold">Age:</span>{user.age}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Current medicines</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {medicines.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <Pill className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">{m.name}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Live location</CardTitle><CardDescription>Shared with contacts</CardDescription></CardHeader>
          <CardContent>
            <div className="grid h-40 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-emerald/20">
              <div className="text-center">
                <MapPin className="mx-auto h-8 w-8 text-primary" />
                <div className="mt-1 text-sm font-semibold">Bengaluru, KA</div>
                <div className="text-xs text-muted-foreground">Lat 12.97, Lng 77.59</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>Emergency contacts</CardTitle><CardDescription>From your family list</CardDescription></div>
            <Button asChild size="sm" variant="outline"><Link to="/family"><Users className="mr-1.5 h-3.5 w-3.5" />Manage</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.length === 0 && (
              <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                No emergency contacts set. Open <Link to="/family" className="text-primary underline">Family</Link> to mark someone.
              </div>
            )}
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Phone className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{formatPhone(c.phone_number)}</div>
                </div>
                <Badge variant="outline" className="capitalize">{c.relationship}</Badge>
                <Button asChild size="sm" variant="ghost"><a href={telHref(c.phone_number)} aria-label={`Call ${c.name}`}><Phone className="h-4 w-4" /></a></Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Nearby hospitals</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {nearbyHospitals.map((h) => (
              <div key={h.name} className="flex items-center gap-3 rounded-xl border p-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald/10 text-emerald"><MapPin className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{h.name}</div>
                  <div className="text-xs text-muted-foreground">{h.distance} · ETA {h.eta} · ★ {h.rating}</div>
                </div>
                <Button size="sm" className="gradient-bg text-white">Directions</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Siren className="h-5 w-5" />Send emergency alert?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A critical-priority alert will be sent to all {contacts.length} of your emergency contacts. Only use this in real emergencies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); sendEmergency(); }}
              disabled={sending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {sending ? "Sending…" : "Send emergency alert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

