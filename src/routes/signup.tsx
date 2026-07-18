import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";

const roles = ["Patient", "Family", "Caregiver", "Doctor", "Hospital", "Admin"];

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up · CareOS AI" }] }),
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const [role, setRole] = useState("Patient");
  return (
    <AuthShell title="Create your account" subtitle="Join CareOS AI in seconds">
      <div className="mb-4">
        <Label className="mb-2 block">I am a…</Label>
        <div className="flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-full border px-3 py-1 text-xs transition ${role === r ? "gradient-bg border-transparent text-white" : "hover:bg-muted"}`}
            >{r}</button>
          ))}
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); nav({ to: "/otp" }); }} className="space-y-4">
        <IconField icon={UserIcon} label="Full name" placeholder="Aarav Sharma" />
        <IconField icon={Mail} label="Email" type="email" placeholder="you@care.os" />
        <IconField icon={Lock} label="Password" type="password" placeholder="At least 8 characters" />
        <Button type="submit" className="w-full gradient-bg text-white shadow-elegant">Create account <ArrowRight className="ml-1 h-4 w-4" /></Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}

function IconField({ icon: Icon, label, ...rest }: { icon: any; label: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input required className="pl-9" {...rest} />
      </div>
    </div>
  );
}
