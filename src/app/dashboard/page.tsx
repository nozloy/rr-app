import { DashboardPageView } from "@/components/dashboard/dashboard-page";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export default async function DashboardPage() {
  const locale = await getRequestLocale();
  const session = await requireSession();

  const characters = await prisma.character.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isActive: "desc" }, { itemLevel: "desc" }, { name: "asc" }],
  });

  return (
    <DashboardPageView
      characters={characters}
      displayName={session.user.name ?? t(locale, "header.playerFallback")}
      locale={locale}
    />
  );
}
