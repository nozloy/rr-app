import {
  DashboardPageView,
  type DashboardProfileTab,
} from "@/components/dashboard/dashboard-page";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

type ProfilePageProps = {
  searchParams: Promise<{
    tab?: string | string[];
  }>;
};

function getProfileTab(value: string | string[] | undefined): DashboardProfileTab {
  const tab = Array.isArray(value) ? value[0] : value;

  return tab === "my-events" ? "my-events" : "overview";
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const locale = await getRequestLocale();
  const session = await requireSession();
  const params = await searchParams;
  const activeTab = getProfileTab(params.tab);

  const [characters, scheduledEvents] = await Promise.all([
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
      },
      orderBy: [{ startsAt: "asc" }],
      where: {
        status: "PUBLISHED",
        userId: session.user.id,
      },
    }),
  ]);

  return (
    <DashboardPageView
      activeTab={activeTab}
      characters={characters}
      displayName={session.user.name ?? t(locale, "header.playerFallback")}
      isAdmin={session.user.isAdmin}
      locale={locale}
      scheduledEvents={scheduledEvents}
    />
  );
}
