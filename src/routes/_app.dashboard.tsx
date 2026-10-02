import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity, Bot, HeartPulse, ShieldCheck, Sparkles, Stethoscope, ThermometerSun,
  TrendingUp, Wind, AlertCircle, FileText,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  user, heartRateData, appointments, medicines,
  family, aiRecommendations,
} from "@/lib/demo-data";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredProfile, PROFILE_UPDATED_EVENT } from "@/lib/profile-helpers";
import { VITAL_UPDATED_EVENT, extractMedicalMetrics } from "@/lib/report-helpers";

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
  analysis?: any;
  vitals?: any;
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
        .select("id,file_name,report_type,patient_label,created_at,ai_summary,structured_results,analysis")
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
    const handleVitalsUpdate = () => { void loadUserReports(); };
    window.addEventListener(PROFILE_UPDATED_EVENT, syncUserName);
    window.addEventListener(VITAL_UPDATED_EVENT, handleVitalsUpdate);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncUserName);
      window.removeEventListener(VITAL_UPDATED_EVENT, handleVitalsUpdate);
    };
  }, [syncUserName, loadUserReports]);

  const firstName = userName.trim().split(" ")[0] || "User";
  const hasReport = userReports.length > 0;

  // Extract vitals from user reports or local storage fallback
  let extractedVitals = {
    healthScore: "--",
    heartRate: "--",
    bloodPressure: "--",
    bloodSugar: "--",
    oxygen: "--",
    temperature: "--",
    bmi: "--",
  };

  let localVitals: any = null;
  try {
    const raw = localStorage.getItem("careos_dashboard_vitals");
    if (raw) localVitals = JSON.parse(raw);
  } catch {}

  if (hasReport || localVitals) {
    let metrics = {
      heart_rate: localVitals?.heart_rate || "72",
      blood_pressure: localVitals?.blood_pressure || "118/76",
      blood_sugar: localVitals?.blood_sugar || "96",
      spo2: localVitals?.spo2 || "98",
      temperature: localVitals?.temperature || "98.4",
      bmi: localVitals?.bmi || "22.6",
    };

    for (const r of userReports) {
      const parsed = extractMedicalMetrics(r.analysis || { structured_results: r.structured_results });
      if (parsed.heart_rate !== "--") metrics.heart_rate = parsed.heart_rate;
      if (parsed.blood_pressure !== "--") metrics.blood_pressure = parsed.blood_pressure;
      if (parsed.blood_sugar !== "--") metrics.blood_sugar = parsed.blood_sugar;
      if (parsed.spo2 !== "--") metrics.spo2 = parsed.spo2;
      if (parsed.temperature !== "--") metrics.temperature = parsed.temperature;
      if (parsed.bmi !== "--") metrics.bmi = parsed.bmi;
    }

    extractedVitals = {
      healthScore: "87",
      heartRate: metrics.heart_rate,
      bloodPressure: metrics.blood_pressure,
      bloodSugar: metrics.blood_sugar,
      oxygen: metrics.spo2,
      temperature: metrics.temperature,
      bmi: metrics.bmi,
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
                      ? "Your vitals and reports are analyzed. Cardio and vitals are trending optimal."
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

      {/* Vitals grid: 6 cards aligned evenly */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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
          icon={TrendingUp}
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
      </div>

      {/* Main Charts & Upcoming Section */}
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
            <CardTitle className="text-base flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" />Upcoming appointments</CardTitle>
            <CardDescription>Next 3 scheduled</CardDescription>
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

      {/* Medicines + Family + Recent Reports Grid */}
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

