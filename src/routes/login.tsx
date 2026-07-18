import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart, Mail, Lock, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in · CareOS AI" }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your CareOS AI account">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setTimeout(() => nav({ to: "/dashboard" }), 700);
        }}
        className="space-y-4"
      >
        <div>
          <Label>Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input required type="email" placeholder="you@care.os" className="pl-9" defaultValue="aarav@careos.ai" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between"><Label>Password</Label><Link to="/forgot" className="text-xs text-primary hover:underline">Forgot?</Link></div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input required type="password" placeholder="••••••••" className="pl-9" defaultValue="password" />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full gradient-bg text-white shadow-elegant">
          {loading ? "Signing in…" : (<>Log in <ArrowRight className="ml-1 h-4 w-4" /></>)}
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-2">
        <Button variant="outline" className="w-full">Continue with Google</Button>
        <Button variant="outline" className="w-full">Continue with Apple</Button>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account? <Link to="/signup" className="font-semibold text-primary hover:underline">Sign up</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-emerald/15 blur-[100px]" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-11 w-11 place-items-center rounded-2xl gradient-bg shadow-glow">
              <Heart className="h-6 w-6 text-white" fill="white" />
            </div>
            <span className="text-xl font-bold">CareOS <span className="gradient-text">AI</span></span>
          </Link>
        </div>
        <Card className="border-0 shadow-elegant">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
