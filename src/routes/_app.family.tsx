import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Bell, Mail, Pencil, Phone, Plus, Shield, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  AVAILABILITY, RELATIONSHIPS, availabilityMeta, formatPhone, isValidPhone,
  normalizePhone, relationshipLabel, telHref,
} from "@/lib/family-helpers";

type FamilyMember = Database["public"]["Tables"]["family_members"]["Row"];
type Availability = Database["public"]["Enums"]["availability_status"];
type Relationship = Database["public"]["Enums"]["relationship_type"];

export const Route = createFileRoute("/_app/family")({
  head: () => ({ meta: [{ title: "Family Members · Sahara" }] }),
  component: FamilyPage,
});

function FamilyPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["family_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .order("is_emergency_contact", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FamilyMember[];
    },
  });

  // realtime updates
  useEffect(() => {
    const ch = supabase
      .channel("family_members_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "family_members" }, () => {
        qc.invalidateQueries({ queryKey: ["family_members"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function openAdd() { setEditing(null); setDialogOpen(true); }
  function openEdit(m: FamilyMember) { setEditing(m); setDialogOpen(true); }

  const emergencyContacts = members.filter((m) => m.is_emergency_contact);

  return (
    <div>
      <PageHeader
        title="Family members"
        subtitle="Manage the people you care for and stay one tap away."
        actions={
          <Button onClick={openAdd} className="gradient-bg text-white">
            <Plus className="mr-2 h-4 w-4" />Add member
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat icon={Users} label="Family members" value={members.length} />
        <Stat icon={Shield} label="Emergency contacts" value={emergencyContacts.length} tone="destructive" />
        <Stat icon={Bell} label="Notifications on" value={members.filter((m) => m.notification_enabled).length} tone="emerald" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0,1,2].map((i) => <Card key={i} className="h-64 animate-pulse bg-muted/30" />)}
        </div>
      ) : members.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m, i) => (
            <MemberCard key={m.id} member={m} index={i} onEdit={openEdit} userId={userId} />
          ))}
        </div>
      )}

      <MemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editing}
        userId={userId}
      />
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = "primary" }: {
  icon: typeof Users; label: string; value: number; tone?: "primary" | "emerald" | "destructive";
}) {
  const cls = tone === "destructive" ? "bg-destructive/10 text-destructive"
    : tone === "emerald" ? "bg-emerald/10 text-emerald" : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${cls}`}><Icon className="h-5 w-5" /></div>
        <div><div className="text-2xl font-bold leading-none">{value}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="grid place-items-center gap-3 p-12 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Users className="h-7 w-7" /></div>
        <div className="text-lg font-semibold">No family members yet</div>
        <p className="max-w-md text-sm text-muted-foreground">Add the people you care for. You'll be able to call them, send alerts, and mark emergency contacts.</p>
        <Button onClick={onAdd} className="gradient-bg text-white"><Plus className="mr-2 h-4 w-4" />Add your first member</Button>
      </CardContent>
    </Card>
  );
}

function MemberCard({ member, index, onEdit, userId }: {
  member: FamilyMember; index: number; onEdit: (m: FamilyMember) => void; userId: string | null;
}) {
  const qc = useQueryClient();
  const av = availabilityMeta(member.availability_status);
  const [callOpen, setCallOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("family_members").delete().eq("id", member.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${member.name} removed`); qc.invalidateQueries({ queryKey: ["family_members"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleEmergency = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("family_members")
        .update({ is_emergency_contact: !member.is_emergency_contact }).eq("id", member.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family_members"] }),
  });

  const setStatus = useMutation({
    mutationFn: async (status: Availability) => {
      const { error } = await supabase.from("family_members")
        .update({ availability_status: status }).eq("id", member.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family_members"] }),
  });

  async function doCall() {
    if (!userId) return;
    await supabase.from("call_logs").insert({
      caller_id: userId,
      family_member_id: member.id,
      phone_number: normalizePhone(member.phone_number),
      call_status: "initiated",
    });
    window.location.href = telHref(member.phone_number);
    setCallOpen(false);
  }

  const isBusy = member.availability_status === "busy" || member.availability_status === "dnd";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card className="group relative overflow-hidden transition hover:shadow-elegant">
        {member.is_emergency_contact && (
          <div className="absolute right-3 top-3 z-10">
            <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Emergency</Badge>
          </div>
        )}
        <div className="h-20 gradient-bg" />
        <CardContent className="-mt-10 pb-5">
          <div className="flex items-end gap-3">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              {member.profile_photo && <AvatarImage src={member.profile_photo} alt={member.name} />}
              <AvatarFallback className="text-lg font-semibold">{member.name.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
          <div className="mt-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-lg font-bold">{member.name}</div>
              <div className="text-xs text-muted-foreground">{relationshipLabel(member.relationship)}</div>
            </div>
            <Select value={member.availability_status} onValueChange={(v) => setStatus.mutate(v as Availability)}>
              <SelectTrigger className="h-8 w-auto gap-1.5 border-0 bg-muted/60 px-2 text-xs">
                <span className={`h-2 w-2 rounded-full ${av.dot}`} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {AVAILABILITY.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${s.dot}`} />{s.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /><span className="truncate">{formatPhone(member.phone_number)}</span>
            </div>
            {member.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /><span className="truncate">{member.email}</span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={() => setCallOpen(true)} className="gap-1.5">
              <Phone className="h-4 w-4" />{isBusy ? "Call anyway" : "Call"}
            </Button>
            <Button variant="outline" onClick={() => setAlertOpen(true)} className="gap-1.5">
              <Bell className="h-4 w-4" />Alert
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            <button
              onClick={() => toggleEmergency.mutate()}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-muted-foreground hover:text-foreground"
            >
              <Shield className={`h-3.5 w-3.5 ${member.is_emergency_contact ? "text-destructive" : ""}`} />
              {member.is_emergency_contact ? "Emergency contact" : "Set as emergency"}
            </button>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(member)} aria-label="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this family member and their alert history.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call confirmation */}
      <AlertDialog open={callOpen} onOpenChange={setCallOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Call {member.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will open your phone's dialer at <span className="font-semibold text-foreground">{formatPhone(member.phone_number)}</span>.
              {isBusy && <div className="mt-2 rounded-md bg-destructive/10 p-2 text-destructive">They're marked as {availabilityMeta(member.availability_status).label}. Consider sending an alert instead.</div>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doCall} className="gradient-bg text-white">Call now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertComposer open={alertOpen} onOpenChange={setAlertOpen} member={member} userId={userId} />
    </motion.div>
  );
}

function AlertComposer({ open, onOpenChange, member, userId }: {
  open: boolean; onOpenChange: (v: boolean) => void; member: FamilyMember; userId: string | null;
}) {
  const [message, setMessage] = useState(`I need your help. Please call me when you are available.`);
  const [priority, setPriority] = useState<Database["public"]["Enums"]["alert_priority"]>("normal");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!userId) return;
    if (!message.trim()) { toast.error("Please write a short message"); return; }
    setSending(true);
    const { error } = await supabase.from("alerts").insert({
      sender_id: userId,
      receiver_id: member.linked_user_id,
      family_member_id: member.id,
      alert_type: "normal",
      priority,
      message: message.trim().slice(0, 500),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Alert sent to ${member.name}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send alert to {member.name}</DialogTitle>
          <DialogDescription>Delivered instantly in Sahara. You can also copy the message and send it via SMS.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea className="mt-1" rows={4} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="mt-1 text-right text-xs text-muted-foreground">{message.length}/500</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending} className="gradient-bg text-white">
            <Bell className="mr-2 h-4 w-4" />{sending ? "Sending…" : "Send alert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberDialog({ open, onOpenChange, member, userId }: {
  open: boolean; onOpenChange: (v: boolean) => void; member: FamilyMember | null; userId: string | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("other");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [notif, setNotif] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(member?.name ?? "");
      setRelationship((member?.relationship as Relationship) ?? "other");
      setPhone(member?.phone_number ?? "");
      setEmail(member?.email ?? "");
      setPhoto(member?.profile_photo ?? "");
      setIsEmergency(member?.is_emergency_contact ?? false);
      setNotif(member?.notification_enabled ?? true);
    }
  }, [open, member]);

  async function save() {
    if (!userId) { toast.error("Not signed in"); return; }
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!isValidPhone(phone)) { toast.error("Enter a valid phone number (7–15 digits, optional +)"); return; }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) { toast.error("Enter a valid email"); return; }

    setSaving(true);
    const payload = {
      name: name.trim().slice(0, 120),
      relationship,
      phone_number: normalizePhone(phone),
      email: email.trim() || null,
      profile_photo: photo.trim() || null,
      is_emergency_contact: isEmergency,
      notification_enabled: notif,
    };
    const res = member
      ? await supabase.from("family_members").update(payload).eq("id", member.id)
      : await supabase.from("family_members").insert({ ...payload, user_id: userId });
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(member ? "Family member updated" : "Family member added");
    qc.invalidateQueries({ queryKey: ["family_members"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{member ? "Edit family member" : "Add family member"}</DialogTitle>
          <DialogDescription>Their phone number stays private and is only used for direct calling and alerts.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Sharma" />
          </div>
          <div>
            <Label>Relationship</Label>
            <Select value={relationship} onValueChange={(v) => setRelationship(v as Relationship)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => <SelectItem key={r} value={r}>{relationshipLabel(r)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" inputMode="tel" />
          </div>
          <div>
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" type="email" />
          </div>
          <div>
            <Label htmlFor="photo">Photo URL (optional)</Label>
            <Input id="photo" value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…" />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-semibold">Emergency contact</div>
              <div className="text-xs text-muted-foreground">Included when you trigger an emergency alert.</div>
            </div>
            <Switch checked={isEmergency} onCheckedChange={setIsEmergency} />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="text-xs text-muted-foreground">Allow this person to receive alerts you send.</div>
            </div>
            <Switch checked={notif} onCheckedChange={setNotif} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gradient-bg text-white">{saving ? "Saving…" : member ? "Save changes" : "Add member"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

