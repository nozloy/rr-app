import type { Metadata } from "next";
import { CreateEventForm } from "@/components/events/create-event-form";
import styles from "@/components/events/create-event-form.module.css";
import { AppHeader } from "@/components/shell/app-header";
import { getEventCatalog } from "@/lib/activity-catalog";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { getEventChannelAvailability } from "@/lib/event-publication";
import { toEventTemplateDto } from "@/lib/event-templates";
import { DEFAULT_EVENT_TIME_ZONE, getTomorrowInputDate } from "@/lib/event-time";
import {
  getPreferredCharacter,
  orderCharactersByPreference,
} from "@/lib/main-character";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Создать рейд | RaidReminder",
};

export default async function NewEventPage() {
  const locale = await getRequestLocale();
  const session = await requireSession();
  const [account, rawCharacters, eventCatalog, rawTemplates] = await Promise.all([
      prisma.user.findUnique({
        select: { mainCharacterId: true, timeZone: true },
        where: { id: session.user.id },
      }),
      prisma.character.findMany({
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
          isActive: true,
          itemLevel: true,
          name: true,
          realm: true,
          thumbnailUrl: true,
        },
      }),
      getEventCatalog(locale),
      prisma.eventTemplate.findMany({
        orderBy: [{ updatedAt: "desc" }],
        where: { userId: session.user.id },
      }),
    ]);
  const orderedCharacters = orderCharactersByPreference(
    rawCharacters,
    account?.mainCharacterId,
  );
  const topCharacter = getPreferredCharacter(
    orderedCharacters,
    account?.mainCharacterId,
  );
  const characters = orderedCharacters;
  const displayName =
    topCharacter?.name ?? session.user.name ?? t(locale, "header.playerFallback");
  const headerUser = {
    avatarUrl:
      topCharacter?.avatarUrl ??
      topCharacter?.thumbnailUrl ??
      session.user.image ??
      null,
    displayName,
    isAdmin: session.user.isAdmin,
  };
  const defaultTimeZone = account?.timeZone ?? DEFAULT_EVENT_TIME_ZONE;
  const templates = rawTemplates
    .map(toEventTemplateDto)
    .filter((template): template is NonNullable<typeof template> => template !== null);

  return (
    <main className={styles.createEventPage} id="top">
      <AppHeader user={headerUser} />
      <CreateEventForm
        channelAvailability={getEventChannelAvailability()}
        characters={characters}
        defaultDate={getTomorrowInputDate(defaultTimeZone)}
        defaultTimeZone={defaultTimeZone}
        displayName={displayName}
        eventCatalog={eventCatalog}
        templates={templates}
      />
    </main>
  );
}
