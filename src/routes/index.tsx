import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity, Bot, Brain, Heart, Pill, ShieldCheck, Siren, Sparkles, Stethoscope, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareOS AI — Healthcare Operating System for Everyone" },
      { name: "description", content: "CareOS AI unifies patients, families, doctors, caregivers and hospitals in one AI-powered healthcare platform." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Bot, title: "AI Health Assistant", desc: "24/7 symptom checker, report analysis, prescription help." },
  { icon: Users, title: "Family Health Hub", desc: "Monitor parents, grandparents and kids in one place." },
  { icon: Pill, title: "Smart Medicines", desc: "Reminders, refill tracking, and adherence scoring." },
  { icon: Activity, title: "Real-time Vitals", desc: "Heart rate, BP, sugar, SpO₂, sleep and more." },
  { icon: Siren, title: "Emergency SOS", desc: "One tap alerts family, doctors and the nearest hospital." },
  { icon: Brain, title: "Mental Wellness", desc: "Mood tracker, meditation and AI therapist support." },
];

const roles = [
  { icon: Heart, label: "Patients" },
  { icon: Users, label: "Families" },
  { icon: ShieldCheck, label: "Caregivers" },
  { icon: Stethoscope, label: "Doctors" },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-40 right-0 h-[400px] w-[400px] rounded-full bg-emerald/20 blur-[100px]" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-bg shadow-glow">
            <Heart className="h-5 w-5 text-white" fill="white" />
          </div>
          <span className="text-lg font-bold tracking-tight">CareOS <span className="gradient-text">AI</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#roles" className="hover:text-foreground">For</a>
          <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/login">Log in</Link></Button>
          <Button asChild size="sm" className="gradient-bg text-white shadow-elegant"><Link to="/signup">Get started</Link></Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-10 pb-24 text-center sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-xs backdrop-blur-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald" />
          <span>AI-native healthcare, built for every family</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl"
        >
          The healthcare <span className="gradient-text">operating system</span><br />
          for patients, doctors & hospitals.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          CareOS AI unifies vitals, medicines, reports, appointments and emergencies —
          with a personal AI health assistant that actually understands you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg" className="gradient-bg text-white shadow-elegant">
            <Link to="/dashboard">Open Dashboard</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/signup">Create account</Link>
          </Button>
        </motion.div>

        <div id="roles" className="mt-16 flex flex-wrap justify-center gap-3">
          {roles.map((r) => (
            <div key={r.label} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm">
              <r.icon className="h-4 w-4 text-primary" />
              <span>{r.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything your health needs.</h2>
          <p className="mt-3 text-muted-foreground">One platform. Every stakeholder. Real intelligence.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition hover:shadow-elegant"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-emerald/0 blur-2xl opacity-70 transition group-hover:opacity-100" />
              <div className="relative">
                <div className="grid h-11 w-11 place-items-center rounded-xl gradient-bg text-white shadow-glow">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CareOS AI. Crafted with care.
      </footer>
    </div>
  );
}
