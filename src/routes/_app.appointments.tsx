import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Video, MapPin, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { appointments } from "@/lib/demo-data";

export const Route = createFileRoute("/_app/appointments")({
  head: () => ({ meta: [{ title: "Appointments · CareOS AI" }] }),
  component: Appointments,
});

function Appointments() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Book, join and manage consultations."
        actions={<Button className="gradient-bg text-white"><Plus className="mr-2 h-4 w-4" />Book new</Button>}
      />

      <Card>
        <CardHeader><CardTitle>Upcoming</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {appointments.map((a) => (
            <div key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border p-3">
              <Avatar className="h-12 w-12"><AvatarImage src={a.avatar} /><AvatarFallback>{a.doctor.slice(3, 5)}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <div className="truncate font-semibold">{a.doctor}</div>
                <div className="truncate text-xs text-muted-foreground">{a.specialty}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{a.date} · {a.time}</span>
                  <span className="flex items-center gap-1">{a.mode === "Video" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}{a.mode}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{a.mode}</Badge>
                <Button size="sm" className="gradient-bg text-white">Join</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

