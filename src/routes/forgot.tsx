import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";

export const Route = createFileRoute("/forgot")({
  head: () => ({ meta: [{ title: "Reset password · CareOS AI" }] }),
  component: Forgot,
});

function Forgot() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll send a secure reset link to your email.">
      <form className="space-y-4">
        <div>
          <Label>Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input required type="email" placeholder="you@care.os" className="pl-9" />
          </div>
        </div>
        <Button className="w-full gradient-bg text-white shadow-elegant">Send reset link</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered? <Link to="/login" className="font-semibold text-primary hover:underline">Back to login</Link>
      </p>
    </AuthShell>
  );
}
