import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { logSecurityEvent } from "@/lib/security";
import { isAccountLocked, recordFailedLogin, recordSuccessfulLogin } from "@/lib/hnsa";



// ---------------------------------------------------------------------------
// Cookie configuration for iframe (Preview Panel) compatibility.
// When SECURE_COOKIES=true, cookies use sameSite='none' + secure=true so they
// are sent in cross-origin iframe contexts (the preview panel embeds the site).
// This requires HTTPS — the external gateway serves the preview over HTTPS.
// ---------------------------------------------------------------------------
const useSecureCookies = process.env.SECURE_COOKIES === "true";

const cookieOptions = {
  httpOnly: true,
  sameSite: useSecureCookies ? ("none" as const) : ("lax" as const),
  path: "/",
  secure: useSecureCookies,
};

const cookiesConfig = {
  sessionToken: {
    name: useSecureCookies
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token",
    options: cookieOptions,
  },
  callbackUrl: {
    name: useSecureCookies
      ? "__Secure-next-auth.callback-url"
      : "next-auth.callback-url",
    options: cookieOptions,
  },
  csrfToken: {
    name: useSecureCookies
      ? "__Secure-next-auth.csrf-token"
      : "next-auth.csrf-token",
    options: cookieOptions,
  },
  pkceCodeVerifier: {
    name: useSecureCookies
      ? "__Secure-next-auth.pkce.code_verifier"
      : "next-auth.pkce.code_verifier",
    options: cookieOptions,
  },
  state: {
    name: useSecureCookies
      ? "__Secure-next-auth.state"
      : "next-auth.state",
    options: cookieOptions,
  },
  nonce: {
    name: useSecureCookies
      ? "__Secure-next-auth.nonce"
      : "next-auth.nonce",
    options: cookieOptions,
  },
};

export const authOptions: NextAuthOptions = {
  cookies: cookiesConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        ip: { label: "IP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.toLowerCase().trim();
        const clientIp = (credentials.ip as string) || "unknown";

        // Brute-force check (HNSA progressive lockout)
        const lockStatus = await isAccountLocked(email);
        if (lockStatus.locked) {
          throw new Error(
            lockStatus.lockedUntil
              ? `Account is locked. Try again after ${lockStatus.lockedUntil.toLocaleTimeString()}.`
              : "Account is permanently locked. Contact support.",
          );
        }

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          await recordFailedLogin(email, clientIp);
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          await recordFailedLogin(email, clientIp);
          throw new Error("Invalid email or password");
        }

        // Successful login — reset brute-force counters via HNSA
        await recordSuccessfulLogin(email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          plan: user.plan,
          role: user.role,
          emailVerified: user.emailVerified,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Session revocation: if user's sessionVersion changed, invalidate token
      if (token.email && !user) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email as string },
          select: { sessionVersion: true },
        });
        if (dbUser && dbUser.sessionVersion !== token.sessionVersion) {
          return {}; // Invalidated — force re-login
        }
      }
      if (user) {
        token.id = user.id;
        token.email = user.email ?? '';
        token.plan = (user as { plan?: string }).plan ?? "free";
        token.role = (user as { role?: string }).role ?? "candidate";
        token.emailVerified = (user as { emailVerified?: boolean }).emailVerified ?? false;
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        (session.user as { name?: string }).name = token.name as string;
        (session.user as { image?: string | null }).image =
          token.picture as string | null;
        (session.user as { plan?: string }).plan = token.plan as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { emailVerified?: boolean }).emailVerified = token.emailVerified as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Augment NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      plan: string;
      role: string;
      emailVerified?: boolean;
    };
  }

  interface User {
    plan?: string;
    role?: string;
    emailVerified?: boolean;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    plan: string;
    role: string;
    emailVerified?: boolean;
    sessionVersion?: number;
  }
}
