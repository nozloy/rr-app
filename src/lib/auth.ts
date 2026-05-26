import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Account, Profile, User } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import BattleNetProvider from "next-auth/providers/battlenet";
import { hasRequiredRuntimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

type BattleNetProfile = Profile & {
  sub?: string;
  battle_tag?: string;
  battletag?: string;
};

const providers = hasRequiredRuntimeEnv()
  ? [
      BattleNetProvider({
        clientId: process.env.BATTLENET_CLIENT_ID ?? "",
        clientSecret: process.env.BATTLENET_CLIENT_SECRET ?? "",
        issuer: "https://eu.battle.net/oauth",
        authorization: {
          params: {
            scope: "openid wow.profile",
          },
        },
        checks: ["state", "nonce"],
        style: {
          bg: "#0d1827",
          text: "#f5fbff",
          bgDark: "#0d1827",
          textDark: "#f5fbff",
          logo: "",
          logoDark: "",
        },
      }),
    ]
  : [];

const adapter = PrismaAdapter(prisma);

export const authOptions: NextAuthOptions = {
  adapter: {
    ...adapter,
    linkAccount(account: Parameters<typeof adapter.linkAccount>[0]) {
      const accountData = { ...account };
      delete accountData.sub;

      return adapter.linkAccount(accountData);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "database",
  },
  providers,
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
  events: {
    async signIn({
      user,
      account,
      profile,
    }: {
      user: User;
      account: Account | null;
      profile?: Profile;
    }) {
      if (
        account?.provider === "battlenet" &&
        account.providerAccountId &&
        user.id
      ) {
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            userId: user.id,
            type: account.type,
            access_token: account.access_token ?? undefined,
            refresh_token: account.refresh_token ?? undefined,
            expires_at:
              typeof account.expires_at === "number"
                ? account.expires_at
                : undefined,
            token_type: account.token_type ?? undefined,
            scope: account.scope ?? undefined,
            id_token: account.id_token ?? undefined,
            session_state:
              typeof account.session_state === "string"
                ? account.session_state
                : undefined,
          },
          create: {
            userId: user.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token ?? null,
            refresh_token: account.refresh_token ?? null,
            expires_at:
              typeof account.expires_at === "number"
                ? account.expires_at
                : null,
            token_type: account.token_type ?? null,
            scope: account.scope ?? null,
            id_token: account.id_token ?? null,
            session_state:
              typeof account.session_state === "string"
                ? account.session_state
                : null,
          },
        });
      }

      const battleNetProfile = profile as BattleNetProfile | undefined;
      const battleTag =
        profile?.name ??
        battleNetProfile?.battle_tag ??
        battleNetProfile?.battletag;

      if (
        account?.provider !== "battlenet" ||
        !user.id ||
        !battleTag ||
        user.name === battleTag
      ) {
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { name: battleTag },
      });
    },
  },
  debug: process.env.NODE_ENV === "development",
};
