import { createFileRoute } from "@tanstack/react-router";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { bpData, sugarData, risks } from "@/lib/demo-data";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "AI Health Analytics · CareOS AI" }] }),
  component: Analytics,
});

const radarData = [
  { m: "Cardio", v: 78 },
  { m: "Metabolic", v: 82 },
  { m: "Sleep", v: 74 },
  { m: "Mental", v: 68 },
  { m: "Nutrition", v: 71 },
  { m: "Activity", v: 88 },
];

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Analytics() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Health Analytics" subtitle="Deep insights and predictive risk models." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Health domain radar</CardTitle><CardDescription>Multi-domain wellness scoring</CardDescription></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="m" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar dataKey="v" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.4} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Predicted risks</CardTitle><CardDescription>AI probability, next 5 years</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {risks.map((r, i) => (
              <div key={r.name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium">{r.name}</span>
                  <span className="tabular-nums text-muted-foreground">{r.value}%</span>
                </div>
                <Progress value={r.value} className="h-2" style={{ ["--progress" as string]: CHART_COLORS[i % CHART_COLORS.length] }} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Blood pressure trend</CardTitle><CardDescription>Last 14 days</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bpData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Line dataKey="systolic" stroke="var(--primary)" strokeWidth={2.5} />
                <Line dataKey="diastolic" stroke="var(--emerald)" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Blood sugar</CardTitle><CardDescription>Fasting vs post-meal</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sugarData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                <Line dataKey="fasting" stroke="var(--primary)" strokeWidth={2.5} />
                <Line dataKey="post" stroke="hsl(340 80% 55%)" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Risk distribution</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={risks} dataKey="value" nameKey="name" outerRadius={110} innerRadius={60} label>
                {risks.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

