import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Brain, Wind, BookHeart, Sparkles } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { moodData } from "@/lib/demo-data";

export const Route = createFileRoute("/_app/wellness")({
  head: () => ({ meta: [{ title: "Mental Wellness · CareOS AI" }] }),
  component: Wellness,
});

const moods = ["😔", "😕", "😐", "🙂", "😄"];

function Wellness() {
  return (
    <div className="space-y-6">
      <PageHeader title="Mental wellness" subtitle="Mood, meditation, breathing, journaling and AI therapy." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Mood tracker</CardTitle><CardDescription>How are you feeling today?</CardDescription></CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-around">
              {moods.map((m, i) => (
                <button key={i} className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-3xl transition hover:scale-110 hover:bg-primary/10">
                  {m}
                </button>
              ))}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                  <Line type="monotone" dataKey="mood" stroke="var(--primary)" strokeWidth={3} dot={{ r: 5, fill: "var(--emerald)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="hero-bg p-6 text-white">
            <Wind className="h-8 w-8" />
            <div className="mt-3 text-xl font-bold">Breathe with me</div>
            <div className="text-sm text-white/80">4-7-8 technique</div>
          </div>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <motion.div
              className="grid h-32 w-32 place-items-center rounded-full gradient-bg text-white"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-sm font-semibold">Inhale…</span>
            </motion.div>
            <Button className="w-full gradient-bg text-white">Start session</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Brain, title: "Meditation", desc: "12 guided sessions" },
          { icon: BookHeart, title: "Journal", desc: "Reflect on your day" },
          { icon: Sparkles, title: "AI therapist", desc: "Confidential chat" },
        ].map((c) => (
          <Card key={c.title} className="cursor-pointer transition hover:shadow-elegant">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl gradient-bg text-white shadow-glow"><c.icon className="h-6 w-6" /></div>
              <div><div className="font-semibold">{c.title}</div><div className="text-xs text-muted-foreground">{c.desc}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

