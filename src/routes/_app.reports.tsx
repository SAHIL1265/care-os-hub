import { createFileRoute } from "@tanstack/react-router";
import { Upload, Camera, FileText, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { reports } from "@/lib/demo-data";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports · CareOS AI" }] }),
  component: Reports,
});

function Reports() {
  return (
    <div className="space-y-6">
      <PageHeader title="Medical reports" subtitle="Upload, scan and let AI find what matters." />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Upload, label: "Upload PDF", desc: "Drag & drop or browse" },
          { icon: Camera, label: "Camera scan", desc: "Snap a paper report" },
          { icon: Sparkles, label: "AI analysis", desc: "Auto-summarize" },
        ].map((s) => (
          <Card key={s.label} className="cursor-pointer border-dashed transition hover:shadow-elegant">
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl gradient-bg text-white shadow-glow"><s.icon className="h-6 w-6" /></div>
              <div className="mt-1 font-semibold">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>All reports, chronologically</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border p-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald/10 text-emerald"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{r.name}</span>
                  {r.flags > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{r.flags} flag</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{r.lab} · {r.date}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={r.status === "Normal" ? "border-emerald/40 text-emerald" : "border-warning/40 text-warning"}>{r.status}</Badge>
                <Button variant="outline" size="sm">View</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

