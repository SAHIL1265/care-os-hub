import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity, Bot, Droplets, Flame, Footprints, HeartPulse, Moon, ShieldCheck,
  Sparkles, Stethoscope, ThermometerSun, TrendingUp, Wind,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line,
  BarChart, Bar, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  user, vitals, heartRateData, sleepData, stepsData, appointments, medicines,
  family, aiRecommendations, reports,
} from "@/lib/demo-data";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · CareOS AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greet}, ${user.name.split(" ")[0]} 👋`}
        subtitle="Here's your health snapshot for today."
        actions={
          <Button className="gradient-bg text-white shadow-elegant">
            <Sparkles className="mr-2 h-4 w-4" /> Ask AI
          </Button>
        }
      />

      {/* Top row: hero score + AI card */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card className="overflow-hidden border-0 hero-bg text-white shadow-elegant">
            <CardContent className="p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
                <div>
                  <Badge className="bg-white/20 text-white hover:bg-white/25">Health Score</Badge>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-6xl font-bold">{vitals.healthScore}</span>
                    <span className="text-white/80">/ 100</span>
                  </div>
                  <p className="mt-3 max-w-sm text-sm text-white/80">
                    You're doing great. Cardio and hydration are trending up this week.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <Button size="sm" className="bg-white text-primary hover:bg-white/90">View report</Button>
                    <Button size="sm" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">Share</Button>
                  </div>
                </div>
                <div className="mx-auto h-40 w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ v: vitals.healthScore }]} startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="v" cornerRadius={20} fill="#ffffff" background={{ fill: "rgba(255,255,255,0.15)" }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl gradient-bg text-white"><Bot className="h-4 w-4" /></div>
                <div>
                  <CardTitle className="text-base">AI Health Assistant</CardTitle>
                  <CardDescription className="text-xs">Personalized insights</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiRecommendations.map((r) => (
                <div key={r.title} className="rounded-xl border bg-muted/40 p-3">
                  <div className="text-sm font-semibold">{r.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                </div>
              ))}
              <Button variant="outline" className="w-full">Open Assistant</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Vitals grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={HeartPulse} label="Heart Rate" value={vitals.heartRate} unit="bpm" delta="+2 from avg" tone="destructive" />
        <StatCard icon={Activity} label="Blood Pressure" value={vitals.bloodPressure} unit="mmHg" delta="Normal" tone="primary" />
        <StatCard icon={Droplets} label="Blood Sugar" value={vitals.bloodSugar} unit="mg/dL" delta="Fasting" tone="warning" />
        <StatCard icon={Wind} label="Oxygen (SpO₂)" value={vitals.oxygen} unit="%" delta="Excellent" tone="info" />
        <StatCard icon={ThermometerSun} label="Temperature" value={vitals.temperature} unit="°F" delta="Normal" tone="warning" />
        <StatCard icon={TrendingUp} label="BMI" value={vitals.bmi} unit="kg/m²" delta="Healthy range" tone="emerald" />
        <StatCard icon={Footprints} label="Steps" value={vitals.steps.toLocaleString()} unit="today" delta="+12% vs yday" tone="primary" />
        <StatCard icon={Flame} label="Calories" value={vitals.calories} unit="kcal" delta="Goal: 2200" tone="destructive" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Heart rate today</CardTitle>
            <CardDescription>Beats per minute · last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={heartRateData}>
                  <defs>
                    <linearGradient id="hr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={3} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                  <Area type="monotone" dataKey="bpm" stroke="var(--primary)" strokeWidth={2.5} fill="url(#hr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Moon className="h-4 w-4 text-primary" />Sleep score</CardTitle>
            <CardDescription>{vitals.sleep} hrs · Deep sleep +12%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sleepData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                  <Bar dataKey="hours" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="deep" fill="var(--emerald)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row: activity + water + upcoming */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily activity</CardTitle>
            <CardDescription>Steps this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stepsData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                  <Line type="monotone" dataKey="steps" stroke="var(--emerald)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Droplets className="h-4 w-4 text-primary" />Water intake</CardTitle>
            <CardDescription>{vitals.water}L of 2.5L</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative h-40 w-24 overflow-hidden rounded-full border-4 border-primary/30 bg-muted/50">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(vitals.water / 2.5) * 100}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary to-emerald"
                />
              </div>
              <div className="mt-4 flex gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={`h-2 w-4 rounded ${i < Math.round(vitals.water / 2.5 * 8) ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" />Upcoming appointments</CardTitle>
            <CardDescription>Next 3</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border bg-muted/30 p-2.5">
                <Avatar className="h-10 w-10"><AvatarImage src={a.avatar} /><AvatarFallback>{a.doctor.slice(3, 5)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{a.doctor}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{a.specialty} · {a.date} · {a.time}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{a.mode}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Medicines + Family + Reports */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medicine reminders</CardTitle>
            <CardDescription>Adherence 92% this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {medicines.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${m.taken ? "bg-emerald/15 text-emerald" : "bg-warning/15 text-warning"}`}>
                  <span className="text-xs font-bold">{m.taken ? "✓" : "⏰"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{m.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{m.schedule}</div>
                </div>
                <Progress value={(m.stock / 60) * 100} className="w-14" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Family health</CardTitle>
            <CardDescription>{family.length} members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {family.slice(0, 4).map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                <Avatar className="h-9 w-9"><AvatarImage src={f.avatar} /><AvatarFallback>{f.name[0]}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{f.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{f.relation} · {f.age}y</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{f.score}</div>
                  <div className={`text-[10px] ${f.risk === "High" ? "text-destructive" : f.risk === "Moderate" ? "text-warning" : "text-emerald"}`}>{f.risk}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald" />Recent reports</CardTitle>
            <CardDescription>Analyzed by AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.slice(0, 4).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{r.lab} · {r.date}</div>
                </div>
                <Badge variant={r.status === "Normal" ? "outline" : "destructive"} className={r.status === "Normal" ? "border-emerald/40 text-emerald" : ""}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
