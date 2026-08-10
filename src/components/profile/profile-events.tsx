import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  Broadcast,
  CalendarBlank,
  Plus,
  Sword,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventOwnerActions } from "@/components/events/event-owner-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t, type AppLocale } from "@/lib/i18n";

export type ProfileScheduledEvent = Prisma.ScheduledEventGetPayload<{
  include: {
    activities: {
      include: {
        activity: true;
      };
    };
    difficulty: true;
    deliveries: true;
  };
}>;

type ProfileEventsProps = {
  events: ProfileScheduledEvent[];
  locale: AppLocale;
  now: Date;
};

export function splitProfileEvents(
  events: ProfileScheduledEvent[],
  now: Date,
) {
  const upcoming = events
    .filter(
      (event) => event.status === "PUBLISHED" && event.startsAt >= now,
    )
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  const past = events
    .filter(
      (event) => event.status === "CANCELLED" || event.startsAt < now,
    )
    .sort((left, right) => right.startsAt.getTime() - left.startsAt.getTime());

  return { past, upcoming };
}

function localizeActivityName(
  locale: AppLocale,
  activity: ProfileScheduledEvent["activities"][number]["activity"],
) {
  return locale === "ru" ? activity.nameRu : activity.nameEn;
}

function localizeDifficulty(
  locale: AppLocale,
  difficulty: ProfileScheduledEvent["difficulty"],
) {
  return locale === "ru" ? difficulty.labelRu : difficulty.labelEn;
}

function formatEventDate(event: ProfileScheduledEvent, locale: AppLocale) {
  const [year, month, day] = event.localDate.split("-").map(Number);
  const date =
    year && month && day
      ? new Date(Date.UTC(year, month - 1, day))
      : event.startsAt;
  const formattedDate = new Intl.DateTimeFormat(
    locale === "ru" ? "ru-RU" : "en-US",
    { day: "numeric", month: "long", timeZone: "UTC", year: "numeric" },
  ).format(date);

  return `${formattedDate}, ${event.localTime} ${event.timeZone}`;
}

function getActivityTypeLabel(
  locale: AppLocale,
  activityType: ProfileScheduledEvent["activityType"],
) {
  if (activityType === "RAID") {
    return t(locale, "events.typeRaid");
  }

  if (activityType === "DUNGEON") {
    return t(locale, "events.typeDungeon");
  }

  if (activityType === "SEASON") {
    return t(locale, "events.typeSeason");
  }

  return t(locale, "events.typeWorld");
}

function formatRange(min: number, max: number) {
  return min === max ? String(min) : `${min}–${max}`;
}

function getPublishTargetLabel(
  locale: AppLocale,
  target: ProfileScheduledEvent["publishTargets"][number],
) {
  if (target === "APP") {
    return locale === "ru" ? "Сайт" : "App";
  }

  if (target === "CUSTOM") {
    return locale === "ru" ? "Свой канал" : "Custom";
  }

  return target[0] + target.slice(1).toLowerCase();
}

function EventRow({
  event,
  locale,
  now,
}: {
  event: ProfileScheduledEvent;
  locale: AppLocale;
  now: Date;
}) {
  const activityNames = event.activities.map(({ activity }) =>
    localizeActivityName(locale, activity),
  );
  const primaryActivity = event.activities[0]?.activity ?? null;
  const title =
    activityNames.length > 0
      ? activityNames.join(", ")
      : locale === "ru"
        ? "Событие"
        : "Event";
  const composition = `${t(locale, "events.roleTanks")} ${formatRange(event.tankMin, event.tankMax)} · ${t(locale, "events.roleHealers")} ${formatRange(event.healerMin, event.healerMax)} · ${t(locale, "events.roleDamage")} ${formatRange(event.damageMin, event.damageMax)}`;
  const deliveries = event.deliveries ?? [];

  return (
    <Card className="overflow-hidden shadow-none">
      <CardHeader className="gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
            {primaryActivity?.artPath ? (
              <Image
                alt=""
                fill
                sizes="56px"
                src={primaryActivity.artPath}
              />
            ) : (
              <span className="grid size-full place-items-center text-muted-foreground">
                <Sword aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <CardTitle className="text-base leading-snug">
              <Link className="hover:underline" href={`/events/${event.id}`}>{title}</Link>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {localizeDifficulty(locale, event.difficulty)}
              </Badge>
              <Badge variant="secondary">
                {getActivityTypeLabel(locale, event.activityType)}
              </Badge>
              {event.status === "CANCELLED" ? (
                <Badge variant="danger">{locale === "ru" ? "Отменено" : "Cancelled"}</Badge>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 px-4 pb-4 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
        <span className="flex min-w-0 items-center gap-2">
          <CalendarBlank aria-hidden="true" />
          {formatEventDate(event, locale)}
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <UsersThree aria-hidden="true" />
          {event.leaderName}-{event.leaderRealm}
        </span>
        <span className="flex min-w-0 items-center gap-2 sm:col-span-2 xl:col-span-1">
          <Broadcast aria-hidden="true" />
          {event.publishTargets.map((target) =>
            getPublishTargetLabel(locale, target),
          ).join(", ") || (locale === "ru" ? "Не опубликовано" : "Not published")}
        </span>
        <span className="sm:col-span-2 xl:col-span-3">{composition}</span>
        <span className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-3">
          <Button asChild size="sm" variant="outline"><Link href={`/events/${event.id}`}>{locale === "ru" ? "Открыть" : "Open"}</Link></Button>
        </span>
        <div className="sm:col-span-2 xl:col-span-3">
          <EventOwnerActions
            canEdit={event.status === "PUBLISHED" && event.startsAt > now}
            compact
            deliveries={deliveries.map((delivery) => ({
              lastAttemptAt: delivery.lastAttemptAt?.toISOString() ?? null,
              lastErrorMessage: delivery.lastErrorMessage,
              status: delivery.status,
              target: delivery.target,
            }))}
            eventId={event.id}
            isCancelled={event.status === "CANCELLED"}
            version={event.version}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function EventsSection({
  emptyDescription,
  emptyTitle,
  events,
  locale,
  title,
  now,
}: {
  emptyDescription: string;
  emptyTitle: string;
  events: ProfileScheduledEvent[];
  locale: AppLocale;
  title: string;
  now: Date;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <Badge variant="secondary">{events.length}</Badge>
      </div>

      {events.length > 0 ? (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <EventRow event={event} key={event.id} locale={locale} now={now} />
          ))}
        </div>
      ) : (
        <Empty className="min-h-44 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarBlank aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}

export function ProfileEvents({ events, locale, now }: ProfileEventsProps) {
  const { past, upcoming } = splitProfileEvents(events, now);
  const isRussian = locale === "ru";

  return (
    <Card className="shadow-none">
      <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>{isRussian ? "События" : "Events"}</CardTitle>
          <CardDescription>
            {isRussian
              ? "Ближайшие и завершённые события вашего аккаунта."
              : "Upcoming and completed events from your account."}
          </CardDescription>
        </div>
        <Button asChild>
          <Link href="/events/new">
            <Plus data-icon="inline-start" aria-hidden="true" />
            {isRussian ? "Создать событие" : "Create event"}
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {events.length === 0 ? (
          <Empty className="min-h-[28rem] border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarBlank aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {isRussian ? "Событий пока нет" : "No events yet"}
              </EmptyTitle>
              <EmptyDescription>
                {isRussian
                  ? "Создайте первое событие, и оно появится в этом разделе."
                  : "Create your first event and it will appear here."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link href="/events/new">
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  {isRussian ? "Создать событие" : "Create event"}
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ScrollArea className="h-[min(68vh,48rem)] pr-3 max-lg:h-auto max-lg:pr-0">
            <div className="flex flex-col gap-8">
              <EventsSection
                emptyDescription={
                  isRussian
                    ? "Новых событий нет — можно создать следующее."
                    : "There are no upcoming events — you can create the next one."
                }
                emptyTitle={isRussian ? "Нет ближайших событий" : "No upcoming events"}
                events={upcoming}
                locale={locale}
                now={now}
                title={isRussian ? "Ближайшие" : "Upcoming"}
              />
              {past.length > 0 ? (
                <EventsSection
                  emptyDescription=""
                  emptyTitle=""
                  events={past}
                  locale={locale}
                  now={now}
                  title={isRussian ? "Прошедшие" : "Past"}
                />
              ) : null}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
