import { createFileRoute } from "@tanstack/react-router";
import { Bell, Pill, CalendarDays, HeartPulse, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications · CareOS AI" }] }),
  component: Notifications,
});

const items = [
  { icon: Pill, title: "Amlodipine reminder", desc: "Take 1 tablet at 10:00 AM", time: "2m ago", tone: "primary" },
  { icon: CalendarDays, title: "Appointment today", desc: "Dr. Meera Kapoor at 3:30 PM", time: "1h ago", tone: "emerald" },
  { icon: HeartPulse, title: "Heart rate spike", desc: "Reached 128 bpm during rest", time: "3h ago", tone: "destructive" },
  { icon: FileText, title: "Lipid Profile analyzed", desc: "2 values flagged for review", time: "Yesterday", tone: "warning" },
];

function Notifications() {
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Everything that needs your attention." />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" />Today</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((n, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border p-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl bg-${n.tone}/10 text-${n.tone}`}><n.icon className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{n.title}</div>
                <div className="text-xs text-muted-foreground">{n.desc}</div>
              </div>
              <div className="text-[11px] text-muted-foreground">{n.time}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

