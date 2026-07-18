import { createFileRoute } from "@tanstack/react-router";
import { Activity, Flame, Footprints, HeartPulse, Moon, Timer } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { stepsData, sleepData, heartRateData, vitals } from "@/lib/demo-data";

export const Route = createFileRoute("/_app/fitness")({
  head: () => ({ meta: [{ title: "Fitness · CareOS AI" }] }),
  component: Fitness,
});

function Fitness() {
  return (
    <div className="space-y-6">
      <PageHeader title="Fitness" subtitle="Steps, calories, workouts, heart rate and sleep." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Footprints} label="Steps" value={vitals.steps.toLocaleString()} unit="today" tone="primary" />
        <StatCard icon={Flame} label="Calories" value={vitals.calories} unit="kcal" tone="destructive" />
        <StatCard icon={Timer} label="Active mins" value={64} unit="min" tone="emerald" />
        <StatCard icon={HeartPulse} label="Resting HR" value={vitals.heartRate} unit="bpm" tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Weekly steps</CardTitle><CardDescription>Goal 10,000 / day</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stepsData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Bar dataKey="steps" fill="var(--emerald)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Heart rate zones</CardTitle><CardDescription>Last 24 hours</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={heartRateData}>
                <defs>
                  <linearGradient id="hr2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={3} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Area dataKey="bpm" stroke="var(--destructive)" fill="url(#hr2)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Moon className="h-4 w-4" />Sleep quality</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sleepData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
              <Bar dataKey="hours" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="deep" fill="var(--emerald)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Morning Yoga", desc: "20 min · calm", tag: "Yoga" },
          { title: "HIIT Blast", desc: "18 min · burn 220 kcal", tag: "Workout" },
          { title: "Evening Walk", desc: "30 min · outdoor", tag: "Cardio" },
        ].map((w) => (
          <Card key={w.title} className="overflow-hidden">
            <div className="h-24 gradient-bg" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-3 w-3" />{w.tag}</div>
              <div className="mt-1 font-semibold">{w.title}</div>
              <div className="text-xs text-muted-foreground">{w.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

