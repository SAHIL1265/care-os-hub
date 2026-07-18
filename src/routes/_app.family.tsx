import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, HeartPulse, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { family } from "@/lib/demo-data";

export const Route = createFileRoute("/_app/family")({
  head: () => ({ meta: [{ title: "Family · CareOS AI" }] }),
  component: Family,
});

function Family() {
  return (
    <div>
      <PageHeader
        title="Family health"
        subtitle="Everyone you love, in one healthy view."
        actions={<Button className="gradient-bg text-white"><Plus className="mr-2 h-4 w-4" />Add member</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {family.map((f, i) => (
          <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="group relative overflow-hidden transition hover:shadow-elegant">
              {f.emergency && (
                <div className="absolute right-3 top-3 z-10">
                  <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />SOS</Badge>
                </div>
              )}
              <div className="h-24 gradient-bg" />
              <CardContent className="-mt-10 pb-5">
                <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                  <AvatarImage src={f.avatar} />
                  <AvatarFallback>{f.name[0]}</AvatarFallback>
                </Avatar>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-bold">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.relation} · {f.age} years</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold gradient-text">{f.score}</div>
                    <div className="text-[10px] text-muted-foreground">score</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="flex items-center justify-center gap-1 text-xs font-semibold"><HeartPulse className="h-3 w-3 text-destructive" />{f.heartRate}</div>
                    <div className="text-[10px] text-muted-foreground">bpm</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className={`text-xs font-semibold ${f.risk === "High" ? "text-destructive" : f.risk === "Moderate" ? "text-warning" : "text-emerald"}`}>{f.risk}</div>
                    <div className="text-[10px] text-muted-foreground">risk</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="truncate text-xs font-semibold">{f.meds}</div>
                    <div className="text-[10px] text-muted-foreground">meds</div>
                  </div>
                </div>
                <Button variant="outline" className="mt-4 w-full">View profile</Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

