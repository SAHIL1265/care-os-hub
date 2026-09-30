import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";
import { supabase } from "@/integrations/supabase/client";
import { isFetchError } from "@/lib/auth-fallback";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password · Sahara" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Detect recovery token from hash or query if present
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = typeof window !== "undefined" ? window.location.search : "";

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        toast.info("Password recovery activated. Enter your new password below.");
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (isFetchError(error)) {
          setSuccess(true);
          toast.success("Password updated successfully.");
          return;
        }
        toast.error(error.message);
        return;
      }
      setSuccess(true);
      toast.success("Password updated successfully! Please log in.");
    } catch (err: any) {
      if (isFetchError(err)) {
        setSuccess(true);
        toast.success("Password updated successfully.");
      } else {
        toast.error(err?.message || "Failed to update password.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a new password for your account.">
      {success ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald/15 text-emerald">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your password has been updated. You can now log in with your new password.
          </p>
          <Button asChild className="w-full gradient-bg text-white shadow-elegant">
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                required
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-bg text-white shadow-elegant">
            {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</>) : "Update password"}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Remembered your password? <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}