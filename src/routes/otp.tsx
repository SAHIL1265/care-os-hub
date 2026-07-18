import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { AuthShell } from "./login";

export const Route = createFileRoute("/otp")({
  head: () => ({ meta: [{ title: "Verify · CareOS AI" }] }),
  component: OtpVerify,
});

function OtpVerify() {
  const nav = useNavigate();
  return (
    <AuthShell title="Verify it's you" subtitle="Enter the 6-digit code we sent to your email">
      <div className="flex justify-center">
        <InputOTP maxLength={6} onComplete={() => setTimeout(() => nav({ to: "/dashboard" }), 400)}>
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => (<InputOTPSlot key={i} index={i} />))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button className="mt-6 w-full gradient-bg text-white" onClick={() => nav({ to: "/dashboard" })}>Continue</Button>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Didn't get it? <Link to="/otp" className="font-semibold text-primary hover:underline">Resend</Link>
      </p>
    </AuthShell>
  );
}

*** Add File: src/routes/forgot.tsx
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
