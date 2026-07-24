import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot")({
  head: () => ({ meta: [{ title: "Reset password · Sahara" }] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setSent(true);
      toast.success("Password reset link sent. Check your inbox.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      {sent ? (
        <div className="rounded-md border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, a reset link is on its way.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input required type="email" autoComplete="email" placeholder="you@example.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-bg text-white shadow-elegant">
            {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>) : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-semibold text-primary hover:underline">Back to login</Link>
      </p>
    </AuthShell>
  );
}
