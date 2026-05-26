import { AppHeaderClient, type AppHeaderUser } from "@/components/shell/app-header-client";
import { hasRequiredRuntimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/session";

type AppHeaderProps = {
  className?: string;
  compact?: boolean;
  user?: AppHeaderUser | null;
};

async function getHeaderUser(): Promise<AppHeaderUser | null> {
  const session = await getOptionalSession();

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
    displayName: topCharacter?.name ?? session.user.name ?? "Игрок",
  };
}

export async function AppHeader({
  className,
  compact = false,
  user,
}: AppHeaderProps) {
  const envReady = hasRequiredRuntimeEnv();
  const resolvedUser = user ?? (envReady ? await getHeaderUser() : null);

  return (
    <AppHeaderClient
      className={className}
      compact={compact}
      envReady={envReady}
      user={resolvedUser}
    />
  );
}
