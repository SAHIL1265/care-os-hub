import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity, Bot, HeartPulse, ShieldCheck, Sparkles, Stethoscope, ThermometerSun,
  TrendingUp, Wind, AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  user, appointments, medicines, family, aiRecommendations,
} from "@/lib/demo-data";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredProfile, PROFILE_UPDATED_EVENT } from "@/lib/profile-helpers";
import { VITAL_UPDATED_EVENT, extractMedicalMetrics } from "@/lib/report-helpers";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · CareOS AI" }] }),
  component: Dashboard,
});

function formatVital(val?: any, fallbackVal?: any): string {
  const check = (v: any) => {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s || s === "--" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined" || s.toLowerCase() === "nan") return null;
    return s;
  };
  return check(val) || check(fallbackVal) || "--";
}

function Dashboard() {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const [userName, setUserName] = useState<string>(user.name);
  const [hasReport, setHasReport] = useState<boolean>(false);
  const [vitalsData, setVitalsData] = useState<Record<string, string> | null>(null);

  const syncUserName = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth.user;
    if (u) {
      const cached = getStoredProfile(u.id);
      const name = cached?.full_name || u.user_metadata?.full_name || user.name;
      setUserName(name);
    }
  }, []);

  const loadVitals = useCallback(async () => {
    let local: Record<string, string> | null = null;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("careos_dashboard_vitals") : null;
      if (raw) local = JSON.parse(raw);
    } catch {}

    try {
      const { data, error } = await supabase
        .from("medical_reports")
        .select("analysis,structured_results")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const parsed = extractMedicalMetrics(data[0]?.analysis || { structured_results: data[0]?.structured_results });
        const hr = formatVital(parsed.heart_rate, local?.heart_rate);
        const bp = formatVital(parsed.blood_pressure, local?.blood_pressure);
        const bs = formatVital(parsed.blood_sugar, local?.blood_sugar);
        const o2 = formatVital(parsed.spo2, local?.spo2);
        const temp = formatVital(parsed.temperature, local?.temperature);
        const bmiVal = formatVital(parsed.bmi, local?.bmi);

        const anyValid = [hr, bp, bs, o2, temp, bmiVal].some((v) => v !== "--");
        if (anyValid) {
          setVitalsData({
            heart_rate: hr,
            blood_pressure: bp,
            blood_sugar: bs,
            spo2: o2,
            temperature: temp,
            bmi: bmiVal,
          });
          setHasReport(true);
          return;
        }
      }
    } catch {}

    // Check local reports fallback
    let localList: any[] = [];
    try {
      const rawLocal = typeof window !== "undefined" ? localStorage.getItem("careos_local_medical_reports") : null;
      if (rawLocal) localList = JSON.parse(rawLocal);
    } catch {}

    if (localList.length > 0) {
      const latestLocal = localList[0];
      const parsed = extractMedicalMetrics(latestLocal.analysis || { structured_results: latestLocal.structured_results });
      const hr = formatVital(parsed.heart_rate, local?.heart_rate);
      const bp = formatVital(parsed.blood_pressure, local?.blood_pressure);
      const bs = formatVital(parsed.blood_sugar, local?.blood_sugar);
      const o2 = formatVital(parsed.spo2, local?.spo2);
      const temp = formatVital(parsed.temperature, local?.temperature);
      const bmiVal = formatVital(parsed.bmi, local?.bmi);

      const anyValid = [hr, bp, bs, o2, temp, bmiVal].some((v) => v !== "--");
      if (anyValid) {
        setVitalsData({
          heart_rate: hr,
          blood_pressure: bp,
          blood_sugar: bs,
          spo2: o2,
          temperature: temp,
          bmi: bmiVal,
        });
        setHasReport(true);
        return;
      }
    }

    // Zero reports in system: purge vitals and reset all indicators to '--'
    try {
      localStorage.removeItem("careos_dashboard_vitals");
    } catch {}
    setVitalsData(null);
    setHasReport(false);
  }, []);

  useEffect(() => {
    void syncUserName();
    void loadVitals();
    const handleVitalsUpdate = () => { void loadVitals(); };
    window.addEventListener(PROFILE_UPDATED_EVENT, syncUserName);
    window.addEventListener(VITAL_UPDATED_EVENT, handleVitalsUpdate);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncUserName);
      window.removeEventListener(VITAL_UPDATED_EVENT, handleVitalsUpdate);
    };
  }, [syncUserName, loadVitals]);

  const firstName = userName.trim().split(" ")[0] || "User";

  const extractedVitals = {
    healthScore: hasReport ? "87" : "--",
    heartRate: formatVital(vitalsData?.heart_rate),
    bloodPressure: formatVital(vitalsData?.blood_pressure),
    bloodSugar: formatVital(vitalsData?.blood_sugar),
    oxygen: formatVital(vitalsData?.spo2),
    temperature: formatVital(vitalsData?.temperature),
    bmi: formatVital(vitalsData?.bmi),
  };

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
          unit="bpm"
          delta={hasReport && extractedVitals.heartRate !== "--" ? "From report" : "No report provided"}
          tone="destructive"
        />
        <StatCard
          icon={Activity}
          label="Blood Pressure"
          value={extractedVitals.bloodPressure}
          unit="mmHg"
          delta={hasReport && extractedVitals.bloodPressure !== "--" ? "From report" : "No report provided"}
          tone="primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Blood Sugar"
          value={extractedVitals.bloodSugar}
          unit="mg/dL"
          delta={hasReport && extractedVitals.bloodSugar !== "--" ? "From report" : "No report provided"}
          tone="warning"
        />
        <StatCard
          icon={Wind}
          label="Oxygen (SpO₂)"
          value={extractedVitals.oxygen}
          unit="%"
          delta={hasReport && extractedVitals.oxygen !== "--" ? "From report" : "No report provided"}
          tone="info"
        />
        <StatCard
          icon={ThermometerSun}
          label="Temperature"
          value={extractedVitals.temperature}
          unit="°F"
          delta={hasReport && extractedVitals.temperature !== "--" ? "From report" : "No report provided"}
          tone="warning"
        />
        <StatCard
          icon={TrendingUp}
          label="BMI"
          value={extractedVitals.bmi}
          unit="kg/m²"
          delta={hasReport && extractedVitals.bmi !== "--" ? "From report" : "No report provided"}
          tone="emerald"
        />
      </div>

      {/* Main Dashboard Sections Grid: Appointments + Medicines + Family */}
      <div className="grid gap-4 lg:grid-cols-3">
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
      </div>
    </div>
  );
}

