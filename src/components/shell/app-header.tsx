import { AppHeaderClient, type AppHeaderUser } from "@/components/shell/app-header-client";
import { hasRequiredRuntimeEnv } from "@/lib/env";
import { getRequestLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/session";

type AppHeaderProps = {
  className?: string;
  user?: AppHeaderUser | null;
};

async function getHeaderUser(): Promise<AppHeaderUser | null> {
  const session = await getOptionalSession();
  const locale = await getRequestLocale();

  if (!session?.user?.id) {
    return null;
  }

  const topCharacter = await prisma.character.findFirst({
    where: {
      isActive: true,
      userId: session.user.id,
    },
    orderBy: [{ itemLevel: "desc" }, { name: "asc" }],
    select: {
      avatarUrl: true,
      name: true,
      thumbnailUrl: true,
    },
  });

  return {
    avatarUrl:
      topCharacter?.avatarUrl ??
      topCharacter?.thumbnailUrl ??
      session.user.image ??
      null,
    displayName:
      topCharacter?.name ??
      session.user.name ??
      t(locale, "header.playerFallback"),
  };
}

export async function AppHeader({
  className,
  user,
}: AppHeaderProps) {
  const envReady = hasRequiredRuntimeEnv();
  const resolvedUser = user ?? (envReady ? await getHeaderUser() : null);

  return (
    <AppHeaderClient
      className={className}
      envReady={envReady}
      user={resolvedUser}
    />
  );
}
