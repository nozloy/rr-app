import { ProfilePageView } from "@/components/profile/profile-page";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import {
  getPreferredCharacter,
  orderCharactersByPreference,
} from "@/lib/main-character";
import { prisma } from "@/lib/prisma";
import { getProfileTab } from "@/lib/profile-tabs";
import { requireSession } from "@/lib/session";

type ProfilePageProps = {
  searchParams: Promise<{
    tab?: string | string[];
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const [locale, session, params] = await Promise.all([
    getRequestLocale(),
    requireSession(),
    searchParams,
  ]);
  const activeTab = getProfileTab(params.tab);
  const now = new Date();

  const [account, rawCharacters, scheduledEvents] = await Promise.all([
    prisma.user.findUnique({
      select: { mainCharacterId: true },
      where: { id: session.user.id },
    }),
    prisma.character.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isActive: "desc" }, { itemLevel: "desc" }, { name: "asc" }],
    }),
    prisma.scheduledEvent.findMany({
      include: {
        activities: {
          include: {
            activity: true,
          },
          orderBy: [{ sortOrder: "asc" }],
        },
        difficulty: true,
        deliveries: true,
      },
      orderBy: [{ startsAt: "asc" }],
      where: {
        userId: session.user.id,
      },
    }),
  ]);
  const mainCharacterId = account?.mainCharacterId ?? null;
  const characters = orderCharactersByPreference(rawCharacters, mainCharacterId);
  const mainCharacter = getPreferredCharacter(characters, mainCharacterId);
  const displayName =
    session.user.name ?? t(locale, "header.playerFallback");

  return (
    <ProfilePageView
      activeTab={activeTab}
      characters={characters}
      displayName={displayName}
      fallbackAvatarUrl={session.user.image}
      isAdmin={session.user.isAdmin}
      locale={locale}
      mainCharacter={mainCharacter}
      mainCharacterId={mainCharacterId}
      now={now}
      scheduledEvents={scheduledEvents}
    />
  );
}
