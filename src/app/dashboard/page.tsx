import { DashboardPageView } from "@/components/dashboard/dashboard-page";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireSession();

  const characters = await prisma.character.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isActive: "desc" }, { itemLevel: "desc" }, { name: "asc" }],
  });

  return (
    <DashboardPageView
      characters={characters}
      displayName={session.user.name ?? "Игрок"}
    />
  );
}
