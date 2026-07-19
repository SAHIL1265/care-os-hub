import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, User as UserIcon, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";
import { supabase } from "@/integrations/supabase/client";

const roles = ["Patient", "Family", "Caregiver", "Doctor", "Hospital", "Admin"];

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up · Sahara" }] }),
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const [role, setRole] = useState("Patient");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !fullName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          data: { full_name: fullName.trim(), role },
        },
      });
      if (error) {
        if (error.status === 429) {
          toast.error("Too many requests. Please wait a minute and try again.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("Verification code sent. Check your inbox.");
      nav({ to: "/otp", search: { email: trimmed } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="We'll email you a 6-digit code to verify.">
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <IconField icon={UserIcon} label="Full name" placeholder="Aarav Sharma" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <IconField icon={Mail} label="Email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" disabled={loading} className="w-full gradient-bg text-white shadow-elegant">
          {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending code…</>) : (<>Create account <ArrowRight className="ml-1 h-4 w-4" /></>)}
        </Button>
      </form>
      <div className="mt-5 flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 text-primary shrink-0" />
        <span>Codes expire in 5 minutes. Never share your code with anyone.</span>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}

function IconField({ icon: Icon, label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { icon: any; label: string }) {
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
