import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user repo",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!account || !user.id) return;

      // Store integration tokens after user is created by the adapter
      if (account.provider === "google" || account.provider === "github") {
        await prisma.integration.upsert({
          where: {
            userId_provider: {
              userId: user.id,
              provider: account.provider,
            },
          },
          update: {
            accessToken: account.access_token ?? null,
            refreshToken: account.refresh_token ?? null,
            tokenExpires: account.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
          },
          create: {
            userId: user.id,
            provider: account.provider,
            accessToken: account.access_token ?? null,
            refreshToken: account.refresh_token ?? null,
            tokenExpires: account.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
          },
        });
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
  },
});
