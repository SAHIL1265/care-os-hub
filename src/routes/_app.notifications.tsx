import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, CheckCheck, Send, Siren } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AlertRow = Database["public"]["Tables"]["alerts"]["Row"];

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Sahara" }] }),
  component: Notifications,
});

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function Notifications() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const { data: received = [] } = useQuery({
    queryKey: ["alerts", "received", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("alerts").select("*")
        .eq("receiver_id", userId!).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as AlertRow[];
    },
  });
  const { data: sent = [] } = useQuery({
    queryKey: ["alerts", "sent", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("alerts").select("*")
        .eq("sender_id", userId!).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as AlertRow[];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel("alerts_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["alerts"] });
        const row = payload.new as AlertRow | undefined;
        if (payload.eventType === "INSERT" && row && row.receiver_id === userId) {
          toast(row.alert_type === "emergency" ? "🚨 Emergency alert" : "New alert", { description: row.message });
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, userId]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts")
        .update({ status: "read", read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const ids = received.filter((r) => r.status === "unread").map((r) => r.id);
      if (ids.length === 0) return;
      const { error } = await supabase.from("alerts")
        .update({ status: "read", read_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const unread = received.filter((r) => r.status === "unread").length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Real-time alerts from your family."
        actions={
          <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={unread === 0}>
            <CheckCheck className="mr-2 h-4 w-4" />Mark all read
          </Button>
        }
      />

      <Tabs defaultValue="received">
        <TabsList>
          <TabsTrigger value="received" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />Received{unread > 0 && <Badge variant="destructive" className="ml-1">{unread}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5"><Send className="h-3.5 w-3.5" />Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Inbox</CardTitle><CardDescription>Messages other Sahara users sent to you.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {received.length === 0 && <EmptyRow label="No alerts received yet" />}
              {received.map((n) => <AlertRow key={n.id} n={n} onRead={() => markRead.mutate(n.id)} incoming />)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Sent</CardTitle><CardDescription>Alerts you sent to your family.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {sent.length === 0 && <EmptyRow label="You haven't sent any alerts yet" />}
              {sent.map((n) => <AlertRow key={n.id} n={n} />)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{label}</div>;
}

function AlertRow({ n, onRead, incoming }: { n: AlertRow; onRead?: () => void; incoming?: boolean }) {
  const isEmergency = n.alert_type === "emergency" || n.priority === "critical";
  const Icon = isEmergency ? Siren : n.priority === "high" ? AlertTriangle : Bell;
  const tone = isEmergency ? "bg-destructive/10 text-destructive"
    : n.priority === "high" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary";
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${incoming && n.status === "unread" ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-semibold capitalize">{n.alert_type.replace("_", " ")}</div>
          <Badge variant={isEmergency ? "destructive" : "outline"} className="text-[10px] capitalize">{n.priority}</Badge>
          {incoming && n.status === "unread" && <Badge className="text-[10px]">New</Badge>}
        </div>
        <div className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.message}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</div>
        {incoming && n.status === "unread" && onRead && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onRead}>Mark read</Button>
        )}
      </div>
    </div>
  );
}

