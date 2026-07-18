import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Ambulance, Phone, MapPin, HeartPulse, Pill, Droplets, AlertTriangle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { emergencyContacts, nearbyHospitals, user, medicines } from "@/lib/demo-data";

export const Route = createFileRoute("/_app/emergency")({
  head: () => ({ meta: [{ title: "Emergency · CareOS AI" }] }),
  component: Emergency,
});

function Emergency() {
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
            <p className="mt-1 text-sm text-muted-foreground">Instantly calls ambulance, notifies your family, and shares live location + medical profile with responders.</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button size="lg" variant="destructive" className="gap-2"><Ambulance className="h-5 w-5" />Call ambulance</Button>
            <Button size="lg" variant="outline" className="gap-2"><Users className="h-5 w-5" />Notify family</Button>
          </div>
        </CardContent>
      </Card>

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
          <CardHeader><CardTitle>Emergency contacts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {emergencyContacts.map((c) => (
              <div key={c.name} className="flex items-center gap-3 rounded-xl border p-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Phone className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone}</div>
                </div>
                <Badge variant="outline">{c.relation}</Badge>
                <Button size="sm" variant="ghost"><Phone className="h-4 w-4" /></Button>
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
    </div>
  );
}

