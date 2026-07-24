import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id?: string;
    address?: string;
    playerId?: string;
  }
  interface Session {
    user?: User & { id?: string; address?: string; playerId?: string };
  }
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
        token.address = user.address;
        token.playerId = user.playerId;
      }

      // Handle OAuth account linking
      if (account) {
        token.provider = account.provider;

        // For email/Google signups, try to find or create associated Player
        if (user?.email && !user.address) {
          // User signed in via Google or Email, not wallet
          try {
            // Check if email already in use by different Player
            const existingByEmail = await prisma.player.findUnique({
              where: { email: user.email },
            });

            if (existingByEmail && existingByEmail.userId && existingByEmail.userId !== user.id) {
              // Email already linked to a different User
              throw new Error(
                "Email already registered with another account. Please sign in with your original authentication method."
              );
            }

            let player = existingByEmail;

            if (!player) {
              // No Player found by email — check if this User already has one
              // (e.g. from a prior merge or repeated sign-in)
              const existingByUserId = await prisma.player.findUnique({
                where: { userId: user.id },
              });

              if (existingByUserId) {
                // Reuse the existing Player; update email if not yet set
                player = existingByUserId.email
                  ? existingByUserId
                  : await prisma.player.update({
                      where: { id: existingByUserId.id },
                      data: { email: user.email },
                    });
              } else {
                // Genuinely new Google/Email signup — create Player
                player = await prisma.player.create({
                  data: {
                    address: null, // Google-first users start with null address
                    email: user.email,
                    userId: user.id,
                  },
                });
              }
            } else if (!player.userId) {
              // Wallet-first user adding Google email
              player = await prisma.player.update({
                where: { id: player.id },
                data: {
                  email: user.email,
                  userId: user.id,
                },
              });
            }

            token.address = player.address; // May be null for Google-first
            token.playerId = player.id;
            token.id = user.id;
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
              if (error.code === "P2002") {
                // Unique constraint violation
                console.error("Email unique constraint violation:", error);
                throw new Error(
                  "This email is already registered. Please use your original sign-in method."
                );
              }
            }
            throw error;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.address = token.address as string;
        session.user.playerId = token.playerId as string;
      }
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
      name: "Wallet",
      credentials: {
        address: { label: "Address", type: "text" },
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.address || !credentials?.message || !credentials?.signature) {
          throw new Error("Missing wallet credentials");
        }

        try {
          const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/wallet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: credentials.address,
              message: credentials.message,
              signature: credentials.signature,
            }),
          });

          if (!response.ok) {
            throw new Error("Wallet verification failed");
          }

          const { data: player } = await response.json();
          const walletEmail = player.address.toLowerCase();

          // Ensure User record exists for NextAuth linking
          const user = await prisma.user.upsert({
            where: { email: walletEmail },
            create: {
              email: walletEmail,
              name: player.address?.slice(0, 6) + "..." + player.address?.slice(-4),
            },
            update: {
              name: player.address?.slice(0, 6) + "..." + player.address?.slice(-4),
            },
          });

          // Create Account record linking wallet provider to User
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: "wallet",
                providerAccountId: player.address.toLowerCase(),
              },
            },
            create: {
              userId: user.id,
              type: "credentials",
              provider: "wallet",
              providerAccountId: player.address.toLowerCase(),
            },
            update: {
              userId: user.id,
            },
          });

          return {
            id: user.id,
            email: walletEmail,
            address: player.address,
            playerId: player.id,
            name: player.address?.slice(0, 6) + "..." + player.address?.slice(-4),
          };
        } catch (error) {
          console.error("Wallet auth error:", error);
          return null;
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
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
