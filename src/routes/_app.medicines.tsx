import { createFileRoute } from "@tanstack/react-router";
import { Pill, Plus, ScanLine, QrCode, Barcode, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { medicines } from "@/lib/demo-data";

export const Route = createFileRoute("/_app/medicines")({
  head: () => ({ meta: [{ title: "Medicines · CareOS AI" }] }),
  component: Medicines,
});

function Medicines() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicine management"
        subtitle="Reminders, refills, inventory and scanners."
        actions={<Button className="gradient-bg text-white"><Plus className="mr-2 h-4 w-4" />Add medicine</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[{ icon: ScanLine, label: "Scan medicine" }, { icon: Barcode, label: "Barcode scan" }, { icon: QrCode, label: "QR scan" }].map((s) => (
          <Card key={s.label} className="cursor-pointer transition hover:shadow-elegant">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl gradient-bg text-white shadow-glow"><s.icon className="h-6 w-6" /></div>
              <div>
                <div className="font-semibold">{s.label}</div>
                <div className="text-xs text-muted-foreground">Instant AI recognition</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's schedule</CardTitle>
          <CardDescription>Adherence 92% this week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {medicines.map((m) => (
            <div key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border p-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Pill className="h-5 w-5" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{m.name}</span>
                  {m.status === "critical" && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Refill</Badge>}
                  {m.status === "low" && <Badge className="bg-warning/20 text-warning hover:bg-warning/25">Low stock</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{m.schedule} · {m.stock} pills left · refill in {m.refillIn} days</div>
                <Progress value={(m.stock / 60) * 100} className="mt-2 h-1.5" />
              </div>
              <Button variant={m.taken ? "outline" : "default"} size="sm" className={m.taken ? "" : "gradient-bg text-white"}>
                {m.taken ? "Taken" : "Mark taken"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

