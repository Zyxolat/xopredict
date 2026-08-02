import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";

declare module "next-auth" {
  interface User {
    id?: string;
    username?: string;
    displayName?: string;
    emailVerified?: string | Date | null;
    role?: string;
    isAdmin?: boolean;
    playerId?: string;
  }
  interface Session {
    user?: User & {
      id?: string;
      username?: string;
      displayName?: string;
      emailVerified?: string | Date | null;
      role?: string;
      isAdmin?: boolean;
      playerId?: string;
    };
    /** Unix timestamp (seconds) the underlying JWT was issued at — used to detect stale tokens after a password change. */
    iat?: number;
  }
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET environment variable is required");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }

      if (!token.id) {
        return token;
      }

      // Google OAuth sign-ins don't go through /api/auth/register, so ensure
      // a linked Player row exists for the game profile.
      if (account?.provider === "google") {
        try {
          const existingPlayer = await prisma.player.findUnique({
            where: { userId: token.id as string },
          });

          if (!existingPlayer) {
            await prisma.player.create({
              data: { userId: token.id as string },
            });
          }
        } catch (error) {
          console.error("Failed to provision Player for Google sign-in:", error);
        }
      }

      // Hydrate the token with the latest identity fields + linked Player id.
      // Only re-fetch when missing, so this stays a one-time cost per session.
      if (token.role === undefined) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            email: true,
            username: true,
            displayName: true,
            role: true,
            isAdmin: true,
            emailVerified: true,
            player: { select: { id: true } },
          },
        });

        if (dbUser) {
          token.email = dbUser.email ?? undefined;
          token.username = dbUser.username ?? undefined;
          token.displayName = dbUser.displayName ?? undefined;
          token.role = dbUser.role;
          token.isAdmin = dbUser.isAdmin;
          token.emailVerified = dbUser.emailVerified;
          token.playerId = dbUser.player?.id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = (token.email as string | undefined) ?? session.user.email;
        session.user.username = token.username as string | undefined;
        session.user.displayName = token.displayName as string | undefined;
        session.user.role = token.role as string | undefined;
        session.user.isAdmin = token.isAdmin as boolean | undefined;
        session.user.emailVerified = token.emailVerified as string | Date | null | undefined;
        session.user.playerId = token.playerId as string | undefined;
      }
      session.iat = typeof token.iat === "number" ? token.iat : undefined;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to home page or dashboard after sign in
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const email = credentials.email.toLowerCase().trim();

        const rateLimit = checkRateLimit(`login:${email}`, { limit: 10, windowMs: 15 * 60 * 1000 });
        if (!rateLimit.success) {
          throw new Error("Too many login attempts. Please try again in a few minutes.");
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        if (user.status === "BANNED") {
          throw new Error("This account has been banned");
        }
        if (user.status === "SUSPENDED") {
          throw new Error("This account has been suspended");
        }

        const isValid = await verifyPassword(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username ?? undefined,
          displayName: user.displayName ?? undefined,
          role: user.role,
          isAdmin: user.isAdmin,
          emailVerified: user.emailVerified,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // SECURITY: do NOT enable allowDangerousEmailAccountLinking.
            // Doing so would silently attach a Google identity to any
            // pre-existing (possibly attacker-created, unverified) User row
            // sharing the same email address, letting whoever set that
            // row's password log in as the real Google-account owner.
            // NextAuth's safe default (false) instead throws
            // OAuthAccountNotLinked when emails collide across providers.
          }),
        ]
      : []),
    ...(process.env.RESEND_API_KEY
      ? [
          // Email provider using Resend (optional)
          // To enable: set RESEND_API_KEY in .env.local
          // import { ResendProvider } from "next-auth/providers/resend";
          // ResendProvider({ apiKey: process.env.RESEND_API_KEY })
        ]
      : []),
    ...(process.env.EMAIL_SERVER && process.env.EMAIL_FROM
      ? [
          EmailProvider({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM,
          }),
        ]
      : []),
  ],
};
