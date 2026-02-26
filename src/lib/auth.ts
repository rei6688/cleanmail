import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { upsertUser } from "@/repositories/users";
import { upsertOAuthAccount } from "@/repositories/oauth-accounts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
      issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID ?? "common"}/v2.0/`,
      authorization: {
        params: {
          scope:
            "openid email profile offline_access Mail.ReadWrite MailboxSettings.Read",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== "microsoft-entra-id") return false;

      try {
        const dbUser = await upsertUser({
          microsoftId: account.providerAccountId,
          email: user.email ?? "",
          name: user.name ?? "",
          image: user.image ?? undefined,
        });

        await upsertOAuthAccount({
          userId: dbUser._id,
          provider: "microsoft",
          accessToken: account.access_token ?? "",
          refreshToken: account.refresh_token ?? "",
          expiresAt: new Date((account.expires_at ?? 0) * 1000),
          scope: account.scope ?? "",
        });
      } catch (err) {
        console.error("[auth] signIn callback error", err);
        return false;
      }

      return true;
    },

    async jwt({ token, account, profile }) {
      if (account) {
        // First sign-in: attach Microsoft account id to token
        token.microsoftId =
          account.providerAccountId ?? (profile?.sub as string);
      }
      return token;
    },

    async session({ session, token }) {
      if (token.microsoftId) {
        (session.user as typeof session.user & { microsoftId: string }).microsoftId =
          token.microsoftId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
