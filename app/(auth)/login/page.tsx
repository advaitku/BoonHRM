"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Could not send code");
      return;
    }
    toast.success("Code sent — check your email");
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Invalid or expired code");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function devLogin() {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/login", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Dev sign-in failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">BoonHRM</CardTitle>
          <CardDescription>
            {step === "email"
              ? "Sign in with a one-time code sent to your email"
              : `Enter the 6-digit code sent to ${email}`}
          </CardDescription>
        </CardHeader>

        {step === "email" ? (
          <form onSubmit={requestOtp}>
            <CardContent className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </CardContent>
            <CardFooter className="mt-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send code"}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <CardContent className="flex flex-col items-center gap-4">
              <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </CardContent>
            <CardFooter className="mt-4 flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={loading || otp.length !== 6}
              >
                {loading ? "Verifying…" : "Verify & sign in"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loading}
                onClick={() => {
                  setOtp("");
                  setStep("email");
                }}
              >
                Use a different email
              </Button>
            </CardFooter>
          </form>
        )}

        {process.env.NODE_ENV !== "production" && (
          <div className="border-t px-6 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={loading}
              onClick={devLogin}
            >
              ⚡ Dev sign-in as admin
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Development only — this button doesn&apos;t exist in production
              builds.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
