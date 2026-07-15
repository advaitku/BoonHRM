// Public offer page. Terminal states (invalid / expired / answered) render
// server-side with ZERO candidate data; the pending state hands only the token
// to the client gate — offer details are released by verifyOfferEmail after
// the candidate proves they know the email on file.
import { prisma } from "@/lib/prisma";
import { expireOfferToShortlist, getOfferState } from "@/lib/offer";
import { getCompanyName } from "@/lib/settings";
import { OfferFlow } from "@/components/offer/offer-flow";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function TerminalCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="font-heading text-xl">{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function OfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { offerToken: token },
    select: {
      id: true,
      stage: true,
      offerTokenExpiresAt: true,
      offerAcceptedAt: true,
      offerDeclinedAt: true,
    },
  });

  if (!candidate) {
    return (
      <TerminalCard
        title="Link not valid"
        message="This offer link is not valid. Please check the link in your email or contact the hiring team."
      />
    );
  }

  const state = getOfferState(candidate);

  if (state === "expired") {
    // Lazy expiry — don't wait for the daily sweep.
    if (candidate.stage === "APPROVED") {
      await expireOfferToShortlist(candidate.id, "APPROVED");
    }
    return (
      <TerminalCard
        title="Link expired"
        message="This offer link has expired. Please contact the hiring team if you'd still like to proceed."
      />
    );
  }

  // Pending, accepted and declined all require the email gate first — the
  // candidate proves the email on file before any offer state is revealed.
  // Only invalid/expired links (handled above) render without the gate, since
  // there's no candidate identity to verify.
  const companyName = await getCompanyName();
  return <OfferFlow token={token} companyName={companyName} />;
}
