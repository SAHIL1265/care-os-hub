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
