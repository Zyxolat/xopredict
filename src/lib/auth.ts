import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface User {
    id?: string;
    address?: string;
  }
  interface Session {
    user?: User & { id?: string; address?: string };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-key",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.address = user.address;
      }
      
      // Handle OAuth account linking
      if (account) {
        token.provider = account.provider;
        
        // For email/Google signups, try to find or create associated Player
        if (user?.email && !user.address) {
          // User signed in via Google or Email, not wallet
          // Try to find existing Player by email
          let player = await prisma.player.findUnique({
            where: { email: user.email },
          });
          
          if (!player) {
            // Create Player record for non-wallet users
            player = await prisma.player.create({
              data: {
                address: user.email, // Use email as placeholder address
                email: user.email,
              },
            });
          }
          
          token.address = player.address;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.address = token.address as string;
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
