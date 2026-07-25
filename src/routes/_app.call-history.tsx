import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, PhoneMissed, PhoneOff, PhoneCall } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatPhone, telHref } from "@/lib/family-helpers";

type CallLog = Database["public"]["Tables"]["call_logs"]["Row"] & {
  family_members?: { name: string | null } | null;
};

export const Route = createFileRoute("/_app/call-history")({
  head: () => ({ meta: [{ title: "Call History · Sahara" }] }),
  component: CallHistory,
});

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function statusMeta(s: string) {
  switch (s) {
    case "missed": return { icon: PhoneMissed, cls: "text-destructive" };
    case "completed": return { icon: PhoneCall, cls: "text-emerald" };
    case "declined": return { icon: PhoneOff, cls: "text-warning" };
    case "busy": return { icon: PhoneOff, cls: "text-warning" };
    default: return { icon: Phone, cls: "text-primary" };
  }
}

function CallHistory() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["call_logs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*, family_members(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as CallLog[];
    },
  });

  return (
    <div>
      <PageHeader title="Call history" subtitle="Every call you started from Sahara." />
      <Card>
        <CardHeader>
          <CardTitle>Recent calls</CardTitle>
          <CardDescription>Numbers are only visible to you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && logs.length === 0 && (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No calls yet. Start one from a family member's card.
            </div>
          )}
          {logs.map((l) => {
            const m = statusMeta(l.call_status);
            const Icon = m.icon;
            return (
              <div key={l.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                <div className={`grid h-9 w-9 place-items-center rounded-lg bg-muted ${m.cls}`}><Icon className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{l.family_members?.name ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{formatPhone(l.phone_number)} · {fmt(l.created_at)}</div>
                </div>
                <Badge variant="outline" className="capitalize">{l.call_status}</Badge>
                <Button asChild size="sm" variant="ghost"><a href={telHref(l.phone_number)} aria-label="Call again"><Phone className="h-4 w-4" /></a></Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}