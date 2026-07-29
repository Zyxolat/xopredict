import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

declare module "next-auth" {
  interface User {
    id?: string;
    username?: string;
    displayName?: string;
    role?: string;
    emailVerified?: Date | null;
    playerId?: string;
  }
  interface Session {
    user?: User & {
      id?: string;
      username?: string;
      displayName?: string;
      role?: string;
      emailVerified?: Date | null;
      playerId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    displayName?: string;
    role?: string;
    emailVerified?: Date | null;
    playerId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign-in: populate token from user record
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.displayName = user.displayName;
        token.role = user.role;
        token.emailVerified = user.emailVerified;
        token.playerId = user.playerId;
      }

      // Handle session update trigger (e.g., after profile edit)
      if (trigger === "update" && session) {
        if (session.username) token.username = session.username;
        if (session.displayName) token.displayName = session.displayName;
      }

      // For Google sign-in: find or create Player, set fields
      if (account?.provider === "google" && user?.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { player: true },
          });

          if (dbUser) {
            // Set username from email prefix if not already set
            if (!dbUser.username && dbUser.email) {
              const prefix = dbUser.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20);
              // Check uniqueness
              const existing = await prisma.user.findFirst({
                where: { username: { equals: prefix, mode: "insensitive" } },
              });
              if (!existing) {
                await prisma.user.update({
                  where: { id: dbUser.id },
                  data: { username: prefix, displayName: dbUser.name || prefix },
                });
                token.username = prefix;
                token.displayName = dbUser.name || prefix;
              }
            } else {
              token.username = dbUser.username || undefined;
              token.displayName = dbUser.displayName || undefined;
            }

            token.role = dbUser.role;
            token.emailVerified = dbUser.emailVerified;

            // Create Player record if not exists
            let player = dbUser.player;
            if (!player) {
              player = await prisma.player.create({
                data: { userId: dbUser.id },
              });
            }
            token.playerId = player.id;
          }
        } catch (error) {
          console.error("JWT callback Google error:", error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.displayName = token.displayName as string;
        session.user.role = token.role as string;
        session.user.emailVerified = token.emailVerified as Date | null;
        session.user.playerId = token.playerId as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  providers: [
    // Email + Password authentication
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
          include: { player: true },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (user.status === "BANNED") {
          throw new Error("This account has been suspended");
        }

        if (user.status === "SUSPENDED") {
          throw new Error("This account is temporarily suspended");
        }

        if (!user.passwordHash) {
          throw new Error("Please sign in with Google or set a password first");
        }

        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) {
          // Record failed login attempt
          await prisma.loginHistory.create({
            data: { userId: user.id, success: false },
          }).catch(() => {});

          throw new Error("Invalid email or password");
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in");
        }

        // Record successful login
        await prisma.loginHistory.create({
          data: { userId: user.id, success: true },
        }).catch(() => {});

        return {
          id: user.id,
          email: user.email,
          username: user.username || undefined,
          displayName: user.displayName || undefined,
          role: user.role,
          emailVerified: user.emailVerified,
          playerId: user.player?.id,
        };
      },
    }),

    // Google OAuth (optional)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
};
