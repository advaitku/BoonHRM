import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email/send";

export const auth = betterAuth({
  appName: "BoonHRM",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "mysql" }),

  // OTP-only: no passwords, no public signup.
  emailAndPassword: { enabled: false },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },

  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 60 * 10, // 10 minutes
      // Only admin-created users may sign in.
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail({ email, otp, type });
      },
    }),
    admin({
      defaultRole: "hr",
      adminRoles: ["admin"],
    }),
    // Must be last: lets server actions set auth cookies.
    nextCookies(),
  ],
});
