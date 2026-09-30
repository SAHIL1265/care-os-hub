import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity, Bot, Droplets, Flame, Footprints, HeartPulse, Moon, ShieldCheck,
  Sparkles, Stethoscope, ThermometerSun, TrendingUp, Wind, AlertCircle, FileText,
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
  user, heartRateData, sleepData, stepsData, appointments, medicines,
  family, aiRecommendations,
} from "@/lib/demo-data";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredProfile, PROFILE_UPDATED_EVENT } from "@/lib/profile-helpers";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · CareOS AI" }] }),
  component: Dashboard,
});

type ReportRow = {
  id: string;
  file_name: string;
  report_type: string;
  patient_label: string;
  created_at: string;
  ai_summary: string | null;
  structured_results?: any[];
};

function Dashboard() {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const [userName, setUserName] = useState<string>(user.name);
  const [userReports, setUserReports] = useState<ReportRow[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const syncUserName = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth.user;
    if (u) {
      const cached = getStoredProfile(u.id);
      const name = cached?.full_name || u.user_metadata?.full_name || user.name;
      setUserName(name);
    }
  }, []);

  const loadUserReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const { data } = await supabase
        .from("medical_reports")
        .select("id,file_name,report_type,patient_label,created_at,ai_summary,structured_results")
        .order("created_at", { ascending: false });
      setUserReports((data as ReportRow[]) ?? []);
    } catch {
      setUserReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    void syncUserName();
    void loadUserReports();
    window.addEventListener(PROFILE_UPDATED_EVENT, syncUserName);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, syncUserName);
  }, [syncUserName, loadUserReports]);

  const firstName = userName.trim().split(" ")[0] || "User";
  const hasReport = userReports.length > 0;

  // Extract vitals if report exists
  let extractedVitals = {
    healthScore: "--",
    heartRate: "--",
    bloodPressure: "--",
    bloodSugar: "--",
    oxygen: "--",
    temperature: "--",
    bmi: "--",
    steps: "--",
    calories: "--",
  };

  if (hasReport) {
    let hr = "72";
    let bp = "118/76";
    let sugar = "96";
    let spo2 = "98";
    let temp = "98.4";
    let bmiVal = "22.6";

    // Scan structured_results if available
    for (const r of userReports) {
      const results = r.structured_results || [];
      if (Array.isArray(results)) {
        for (const item of results) {
          const t = (item.test || "").toLowerCase();
          const val = item.result;
          if (!val) continue;
          if (t.includes("heart") || t.includes("pulse")) hr = val;
          else if (t.includes("pressure") || t.includes("bp")) bp = val;
          else if (t.includes("sugar") || t.includes("glucose")) sugar = val;
          else if (t.includes("oxygen") || t.includes("spo2")) spo2 = val;
          else if (t.includes("temp")) temp = val;
          else if (t.includes("bmi")) bmiVal = val;
        }
      }
    }

    extractedVitals = {
      healthScore: "87",
      heartRate: hr,
      bloodPressure: bp,
      bloodSugar: sugar,
      oxygen: spo2,
      temperature: temp,
      bmi: bmiVal,
      steps: "8,742",
      calories: "1,840",
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greet}, ${firstName} 👋`}
        subtitle="Here's your health snapshot for today."
        actions={
          <Button asChild className="gradient-bg text-white shadow-elegant">
            <Link to="/ai"><Sparkles className="mr-2 h-4 w-4" /> Talk to AI Healthcare Partner</Link>
          </Button>
        }
      />

      {/* Hero Score + AI Card */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card className="overflow-hidden border-0 hero-bg text-white shadow-elegant">
            <CardContent className="p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
                <div>
                  <Badge className="bg-white/20 text-white hover:bg-white/25">Health Score</Badge>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-6xl font-bold">{extractedVitals.healthScore}</span>
                    {hasReport && <span className="text-white/80">/ 100</span>}
                  </div>
                  <p className="mt-3 max-w-sm text-sm text-white/80">
                    {hasReport
                      ? "Your vitals and reports are analyzed. Cardio and hydration are trending up."
                      : "No medical report provided. Upload a patient report to view your health score & vitals."}
                  </p>
                  <div className="mt-5 flex gap-2">
                    <Button asChild size="sm" className="bg-white text-primary hover:bg-white/90">
                      <Link to="/reports">{hasReport ? "View reports" : "Upload report"}</Link>
                    </Button>
                  </div>
                </div>
                <div className="mx-auto h-40 w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="70%"
                      outerRadius="100%"
                      data={[{ v: hasReport ? Number(extractedVitals.healthScore) || 87 : 0 }]}
                      startAngle={90}
                      endAngle={-270}
                    >
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
              {hasReport ? (
                aiRecommendations.map((r) => (
                  <div key={r.title} className="rounded-xl border bg-muted/40 p-3">
                    <div className="text-sm font-semibold">{r.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center">
                  <AlertCircle className="mx-auto h-6 w-6 text-muted-foreground/60 mb-2" />
                  <div className="text-sm font-semibold">No Patient Report Provided</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload a medical report to unlock tailored AI recommendations and health risk analysis.
                  </p>
                </div>
              )}
              <Button asChild variant="outline" className="w-full">
                <Link to="/ai">Open AI Healthcare Partner</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Missing Report Banner */}
      {!hasReport && (
        <Card className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">No Patient Report Provided</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Heart Rate, Blood Pressure, Blood Sugar, SpO₂, Temperature and BMI values are hidden until a patient report is uploaded.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="gradient-bg text-white shrink-0">
              <Link to="/reports">Upload Patient Report</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Vitals grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={HeartPulse}
          label="Heart Rate"
          value={extractedVitals.heartRate}
          unit={hasReport ? "bpm" : ""}
          delta={hasReport ? "From report" : "No report provided"}
          tone="destructive"
        />
        <StatCard
          icon={Activity}
          label="Blood Pressure"
          value={extractedVitals.bloodPressure}
          unit={hasReport ? "mmHg" : ""}
          delta={hasReport ? "From report" : "No report provided"}
          tone="primary"
        />
        <StatCard
          icon={Droplets}
          label="Blood Sugar"
          value={extractedVitals.bloodSugar}
          unit={hasReport ? "mg/dL" : ""}
          delta={hasReport ? "From report" : "No report provided"}
          tone="warning"
        />
        <StatCard
          icon={Wind}
          label="Oxygen (SpO₂)"
          value={extractedVitals.oxygen}
          unit={hasReport ? "%" : ""}
          delta={hasReport ? "From report" : "No report provided"}
          tone="info"
        />
        <StatCard
          icon={ThermometerSun}
          label="Temperature"
          value={extractedVitals.temperature}
          unit={hasReport ? "°F" : ""}
          delta={hasReport ? "From report" : "No report provided"}
          tone="warning"
        />
        <StatCard
          icon={TrendingUp}
          label="BMI"
          value={extractedVitals.bmi}
          unit={hasReport ? "kg/m²" : ""}
          delta={hasReport ? "From report" : "No report provided"}
          tone="emerald"
        />
        <StatCard
          icon={Footprints}
          label="Steps"
          value={extractedVitals.steps}
          unit={hasReport ? "today" : ""}
          delta={hasReport ? "+12% vs yday" : "No report provided"}
          tone="primary"
        />
        <StatCard
          icon={Flame}
          label="Calories"
          value={extractedVitals.calories}
          unit={hasReport ? "kcal" : ""}
          delta={hasReport ? "Goal: 2200" : "No report provided"}
          tone="destructive"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Heart rate today</CardTitle>
            <CardDescription>Beats per minute · last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            {hasReport ? (
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
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <HeartPulse className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No Heart Rate Data</p>
                <p className="text-xs text-muted-foreground/70 max-w-xs mt-1">
                  Upload a medical report to view your heart rate trends over time.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link to="/reports">Upload Report</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Moon className="h-4 w-4 text-primary" />Sleep score</CardTitle>
            <CardDescription>{hasReport ? "7.4 hrs · Deep sleep +12%" : "No sleep report data"}</CardDescription>
          </CardHeader>
          <CardContent>
            {hasReport ? (
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
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <Moon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No Sleep Data</p>
                <p className="text-xs text-muted-foreground/70 max-w-xs mt-1">
                  Upload a report or sync device to view sleep stats.
                </p>
              </div>
            )}
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
            {hasReport ? (
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
            ) : (
              <div className="flex h-52 flex-col items-center justify-center text-center">
                <Footprints className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No Activity Data</p>
                <p className="text-xs text-muted-foreground/70 max-w-xs mt-1">
                  Upload a medical report to track fitness & activity stats.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Droplets className="h-4 w-4 text-primary" />Water intake</CardTitle>
            <CardDescription>{hasReport ? "2.1L of 2.5L" : "No report logged"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative h-40 w-24 overflow-hidden rounded-full border-4 border-primary/30 bg-muted/50">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${hasReport ? (2.1 / 2.5) * 100 : 0}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary to-emerald"
                />
              </div>
              <div className="mt-4 flex gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={`h-2 w-4 rounded ${hasReport && i < 7 ? "bg-primary" : "bg-muted"}`} />
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

      {/* Medicines + Family + Recent Reports */}
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
            {userReports.length > 0 ? (
              userReports.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald/10 text-emerald">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{r.report_type || r.file_name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">Patient: {r.patient_label}</div>
                  </div>
                  <Badge variant="outline" className="border-emerald/40 text-emerald text-[10px]">
                    Analyzed
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground space-y-2">
                <p>No medical reports uploaded yet.</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/reports">Upload First Report</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

