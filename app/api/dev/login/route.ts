import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// DEV-ONLY one-click sign-in. Dead in production builds (404) — it exists so
// local testing doesn't require reading OTP codes from the console.
//
//   POST /api/dev/login            -> signs in as SEED_ADMIN_EMAIL
//   POST /api/dev/login {"email"}  -> signs in as any existing user
//
// It drives Better Auth's real email-OTP flow: request an OTP (captured from
// the dev console hook) and immediately verify it, so the resulting session is
// identical to a real login.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const email: string =
    (typeof body?.email === "string" && body.email) ||
    process.env.SEED_ADMIN_EMAIL ||
    "";
  if (!email) {
    return NextResponse.json(
      { error: "No email given and SEED_ADMIN_EMAIL is not set" },
      { status: 400 },
    );
  }

  await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });

  const captured = (globalThis as Record<string, unknown>).__devLastOtp as
    | { email: string; otp: string }
    | undefined;
  if (!captured || captured.email !== email) {
    return NextResponse.json(
      { error: "Could not capture dev OTP — does this user exist?" },
      { status: 500 },
    );
  }

  // asResponse returns Better Auth's raw response, including Set-Cookie.
  return auth.api.signInEmailOTP({
    body: { email, otp: captured.otp },
    asResponse: true,
  });
}
