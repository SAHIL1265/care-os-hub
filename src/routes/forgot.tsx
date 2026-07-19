import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "./login";

export const Route = createFileRoute("/forgot")({
  head: () => ({ meta: [{ title: "Sign in help · Sahara" }] }),
  component: Forgot,
});

function Forgot() {
  return (
    <AuthShell title="Passwordless sign-in" subtitle="Sahara uses email OTP — there's no password to reset.">
      <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 text-primary shrink-0" />
        <span>Just enter your email on the login page and we'll send you a fresh 6-digit code every time.</span>
      </div>
      <Button asChild className="mt-6 w-full gradient-bg text-white shadow-elegant">
        <Link to="/login">Back to login</Link>
      </Button>
    </AuthShell>
  );
}
