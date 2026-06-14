import type { Metadata } from "next";
import {
  CreateEventForm,
  type EventCharacterOption,
} from "@/components/events/create-event-form";
import styles from "@/components/events/create-event-form.module.css";
import { AppHeader } from "@/components/shell/app-header";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Создать рейд | RaidReminder",
};

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTomorrowInputDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  return toInputDate(date);
}

export default async function NewEventPage() {
  const locale = await getRequestLocale();
  const session = await requireSession();
  const characters: EventCharacterOption[] = await prisma.character.findMany({
    where: {
      isActive: true,
      userId: session.user.id,
    },
    orderBy: [{ itemLevel: "desc" }, { name: "asc" }],
    select: {
      activeSpec: true,
      avatarUrl: true,
      className: true,
      id: true,
      itemLevel: true,
      name: true,
      realm: true,
      thumbnailUrl: true,
    },
  });

  const topCharacter = characters[0] ?? null;
  const displayName =
    topCharacter?.name ?? session.user.name ?? t(locale, "header.playerFallback");
  const headerUser = {
    avatarUrl:
      topCharacter?.avatarUrl ??
      topCharacter?.thumbnailUrl ??
      session.user.image ??
      null,
    displayName,
  };

  return (
    <main className={styles.createEventPage} id="top">
      <AppHeader user={headerUser} />
      <CreateEventForm
        characters={characters}
        defaultDate={getTomorrowInputDate()}
        displayName={displayName}
      />
    </main>
  );
}
