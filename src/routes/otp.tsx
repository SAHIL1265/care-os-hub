import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { AuthShell } from "./login";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ email: z.string().email().optional() });

const EXPIRY_SECONDS = 5 * 60; // 5 minutes
const RESEND_COOLDOWN = 60; // seconds

export const Route = createFileRoute("/otp")({
  head: () => ({ meta: [{ title: "Verify · Sahara" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: OtpVerify,
});

function OtpVerify() {
  const nav = useNavigate();
  const { email } = Route.useSearch();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [expiresAt] = useState(() => Date.now() + EXPIRY_SECONDS * 1000);
  const [nextResendAt, setNextResendAt] = useState(() => Date.now() + RESEND_COOLDOWN * 1000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const expired = secondsLeft === 0;
  const cooldownLeft = Math.max(0, Math.ceil((nextResendAt - now) / 1000));

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60).toString().padStart(1, "0");
    const s = (secondsLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [secondsLeft]);

  useEffect(() => {
    if (!email) nav({ to: "/login" });
  }, [email, nav]);

  async function verify(token: string) {
    if (!email || token.length !== 6 || verifying || success) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error || !data.session) {
        const msg = (error?.message || "").toLowerCase();
        if (msg.includes("expired")) toast.error("This code has expired. Please request a new one.");
        else toast.error("Invalid OTP. Please try again.");
        setCode("");
        return;
      }
      setSuccess(true);
      toast.success("Verified. Welcome back!");
      setTimeout(() => nav({ to: "/dashboard" }), 700);
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    if (!email || cooldownLeft > 0 || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) {
        if (error.status === 429) toast.error("Too many requests. Please wait a moment.");
        else toast.error(error.message);
        return;
      }
      toast.success("A new code has been sent.");
      setNextResendAt(Date.now() + RESEND_COOLDOWN * 1000);
    } finally {
      setResending(false);
    }
  }

  if (success) {
    return (
      <AuthShell title="You're in" subtitle="Redirecting to your dashboard…">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-6">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald/10">
            <CheckCircle2 className="h-10 w-10 text-emerald" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Signing you in…</p>
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verify it's you"
      subtitle={email ? `Enter the 6-digit code sent to ${email}` : "Enter the 6-digit code we sent to your email"}
    >
      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          onComplete={(v) => verify(v)}
          disabled={verifying || expired}
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => (<InputOTPSlot key={i} index={i} />))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="mt-4 flex items-center justify-center text-xs text-muted-foreground">
        {expired ? (
          <span className="text-destructive">Code expired. Please request a new one.</span>
        ) : (
          <span>Code expires in <span className="font-semibold tabular-nums text-foreground">{mmss}</span></span>
        )}
      </div>

      <Button
        className="mt-6 w-full gradient-bg text-white"
        onClick={() => verify(code)}
        disabled={code.length !== 6 || verifying || expired}
      >
        {verifying ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</>) : "Continue"}
      </Button>

      <div className="mt-4 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        <Mail className="h-3.5 w-3.5" />
        Didn't get it?
        <button
          type="button"
          onClick={resend}
          disabled={cooldownLeft > 0 || resending}
          className="ml-1 font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline"
        >
          {resending ? "Sending…" : cooldownLeft > 0 ? `Resend in ${cooldownLeft}s` : "Resend code"}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Wrong email? <Link to="/login" className="font-semibold text-primary hover:underline">Start over</Link>
      </p>
    </AuthShell>
  );
}
