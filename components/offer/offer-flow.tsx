"use client";

// Public offer flow: gate (email on file → emailed 6-digit code) → offer view
// → response. The server hands us only the token; all offer data arrives via
// unlockOffer after the OTP proves inbox control.

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Globe,
  MapPin,
  Phone,
} from "lucide-react";
import {
  requestOfferOtp,
  unlockOffer,
  respondToOffer,
  type OfferPayload,
} from "@/lib/actions/offer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BOON_CONTACT } from "@/lib/brand";

interface OfferFlowProps {
  token: string;
  companyName: string;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function OfferFlow({ token, companyName }: OfferFlowProps) {
  const [step, setStep] = useState<"gate" | "offer" | "accepted" | "declined">(
    "gate",
  );
  const [gatePhase, setGatePhase] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [offer, setOffer] = useState<OfferPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"accept" | "decline" | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [pending, startTransition] = useTransition();

  /** Gate step 1: matching email → a 6-digit code is emailed to it. */
  function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await requestOfferOtp({ token, email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOtp("");
      setGatePhase("code");
      setNotice(`We've sent a 6-digit code to ${email}.`);
    });
  }

  /** Gate step 2: the code proves inbox control and unlocks the offer. */
  function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await unlockOffer({ token, email, otp });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(null);
      setOffer(result.offer);
      // Token may have been answered from another tab meanwhile.
      setStep(result.offer.state === "pending" ? "offer" : result.offer.state);
    });
  }

  function respond(decision: "accept" | "decline") {
    setError(null);
    startTransition(async () => {
      const result = await respondToOffer({ token, email, otp, decision });
      setConfirming(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOffer(result.offer);
      setStep(result.offer.state === "pending" ? "offer" : result.offer.state);
    });
  }

  if (step === "gate") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <Image
            src="/Boon_Logo.png"
            alt={companyName}
            width={56}
            height={47}
            priority
            className="mx-auto"
          />
          <CardTitle className="font-heading text-xl">
            Your offer from {companyName}
          </CardTitle>
          <CardDescription>
            {gatePhase === "email"
              ? "Enter the email address we have on file — we'll send you a verification code."
              : `Enter the 6-digit code sent to ${email}.`}
          </CardDescription>
        </CardHeader>
        {gatePhase === "email" ? (
          <form onSubmit={sendCode}>
            <CardContent className="space-y-2">
              <Label htmlFor="offer-email">Email address</Label>
              <Input
                id="offer-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="mt-4">
              <Button type="submit" className="w-full" disabled={pending || !email}>
                {pending ? "Sending code…" : "Send verification code"}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <CardContent className="space-y-2">
              <Label htmlFor="offer-otp">Verification code</Label>
              <Input
                id="offer-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center text-lg tracking-[0.5em]"
              />
              {notice && !error && (
                <p className="text-sm text-muted-foreground">{notice}</p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="mt-4 flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={pending || otp.length !== 6}
              >
                {pending ? "Verifying…" : "View my offer"}
              </Button>
              <div className="flex w-full justify-between text-sm">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setGatePhase("email");
                    setOtp("");
                    setError(null);
                    setNotice(null);
                  }}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => sendCode()}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Resend code
                </button>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    );
  }

  if (step === "accepted") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <BadgeCheck className="mx-auto size-10 text-primary" />
          <CardTitle className="font-heading text-xl">
            Congratulations on joining {companyName}! 🎉
          </CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              We&apos;re thrilled to have you on board and can&apos;t wait to
              start this journey together.
            </span>
            <span className="block">
              Please note that finalization of your offer is contingent on a
              successful background verification. You&apos;ll receive the next
              steps for verification shortly.
            </span>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (step === "declined") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="font-heading text-xl">
            Thank you for letting us know
          </CardTitle>
          <CardDescription>
            We&apos;ve recorded your response and informed the hiring team. We
            wish you all the best for the future.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // step === "offer"
  if (!offer) return null;

  return (
    <>
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <Image
              src="/Boon_Logo.png"
              alt={offer.companyName}
              width={64}
              height={54}
              priority
            />
            <span className="text-lg font-semibold font-heading tracking-tight">
              {offer.companyName}
            </span>
          </div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Offer of employment
          </p>
          <CardTitle className="font-heading text-2xl">
            {offer.jobTitle}
          </CardTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {offer.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {offer.location}
              </span>
            )}
            {offer.dateOfJoining && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                Joining {formatDate(offer.dateOfJoining)}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-sm">
            Dear {offer.candidateName}, we&apos;re delighted to offer you the{" "}
            <span className="font-medium">{offer.jobTitle}</span> position at{" "}
            {offer.companyName}. Please review the details below and let us
            know your decision.
          </p>

          {offer.ctcDetails && (
            <div className="space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Briefcase className="size-3.5" />
                Compensation
              </h3>
              <div className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
                {offer.ctcDetails}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="offer-agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="offer-agree"
              className="space-y-1 text-sm font-normal leading-snug text-muted-foreground"
            >
              <span className="block">
                I have read and agree to the{" "}
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  Terms &amp; agreement
                </button>
                .
              </span>
              <span className="block">
                I understand this offer is contingent on third-party background
                verification and successful verification of my documents.
              </span>
            </Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>

        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setConfirming("decline")}
          >
            Decline
          </Button>
          <Button
            disabled={pending || !agreed}
            onClick={() => setConfirming("accept")}
          >
            Accept offer
          </Button>
        </CardFooter>

        <div className="flex flex-col items-center gap-2 border-t px-6 py-5 text-center text-sm text-muted-foreground">
          <Image
            src="/Boon_Logo.png"
            alt={offer.companyName}
            width={48}
            height={40}
          />
          <p>
            Questions about your offer? Reach the {offer.companyName} hiring team
            at{" "}
            <a
              href={`mailto:${BOON_CONTACT.email}`}
              className="font-medium text-foreground hover:underline"
            >
              {BOON_CONTACT.email}
            </a>
            .
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <a
              href={BOON_CONTACT.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Globe className="size-3.5" />
              {BOON_CONTACT.websiteLabel}
            </a>
            <a
              href={`tel:${BOON_CONTACT.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Phone className="size-3.5" />
              {BOON_CONTACT.phone}
            </a>
          </div>
          <p className="text-xs">
            © {offer.companyName}. This offer is confidential and intended only
            for {offer.candidateName}.
          </p>
        </div>
      </Card>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Terms &amp; agreement</DialogTitle>
            <DialogDescription>
              Please review the terms of your offer from {offer.companyName}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border p-4 text-sm text-muted-foreground whitespace-pre-wrap">
            {offer.agreement}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTermsOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setAgreed(true);
                setTermsOpen(false);
              }}
            >
              I agree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirming !== null}
        onOpenChange={(v) => !v && setConfirming(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirming === "accept" ? "Accept this offer?" : "Decline this offer?"}
            </DialogTitle>
            <DialogDescription>
              {confirming === "accept"
                ? `You're accepting the ${offer.jobTitle} offer at ${offer.companyName}. The hiring team will be notified.`
                : "This will let the hiring team know you won't be joining. This can't be undone from this page."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              variant={confirming === "decline" ? "destructive" : "default"}
              disabled={pending}
              onClick={() => confirming && respond(confirming)}
            >
              {pending
                ? "Sending…"
                : confirming === "accept"
                  ? "Yes, accept offer"
                  : "Yes, decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
