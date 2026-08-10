import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, Coins, Radio, ScrollText, Swords, UsersRound } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { t, type AppLocale } from "@/lib/i18n";

export type DashboardScheduledEvent = Prisma.ScheduledEventGetPayload<{
  include: {
    activities: {
      include: {
        activity: true;
      };
    };
    difficulty: true;
  };
}>;

type MyEventsPanelProps = {
  events: DashboardScheduledEvent[];
  locale: AppLocale;
};

function localizeActivityName(
  locale: AppLocale,
  activity: DashboardScheduledEvent["activities"][number]["activity"],
) {
  return locale === "ru" ? activity.nameRu : activity.nameEn;
}

function localizeDifficulty(
  locale: AppLocale,
  difficulty: DashboardScheduledEvent["difficulty"],
) {
  return locale === "ru" ? difficulty.labelRu : difficulty.labelEn;
}

function formatLocalDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

function formatRange(min: number, max: number) {
  return min === max ? String(min) : `${min}-${max}`;
}

function formatGold(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US").format(value);
}

function getActivityTypeLabel(
  locale: AppLocale,
  activityType: DashboardScheduledEvent["activityType"],
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

function getPublishTargetLabel(
  locale: AppLocale,
  target: DashboardScheduledEvent["publishTargets"][number],
) {
  if (target === "APP") {
    return locale === "ru" ? "Сайт" : "App";
  }

  if (target === "CUSTOM") {
    return locale === "ru" ? "Свое" : "Custom";
  }

  return target[0] + target.slice(1).toLowerCase();
}

function getUnrollLabel(event: DashboardScheduledEvent, locale: AppLocale) {
  if (!event.hasUnroll) {
    return t(locale, "dashboard.eventNoUnroll");
  }

  if (event.unrollItemIds.length > 0) {
    return `${event.unrollItemIds.length} ID`;
  }

  return event.unrollTemplateId || t(locale, "dashboard.eventUnroll");
}

export function MyEventsPanel({ events, locale }: MyEventsPanelProps) {
  return (
    <section className="dashboard-panel dashboard-my-events-panel" id="my-events">
      <div className="dashboard-panel-heading">
        <h2>{t(locale, "dashboard.myEvents")}</h2>
        <Link href="/events/new">{t(locale, "dashboard.createEvent")}</Link>
      </div>

      {events.length === 0 ? (
        <div className="dashboard-empty-state dashboard-my-events-empty">
          <strong>{t(locale, "dashboard.noEvents")}</strong>
          <span>{t(locale, "dashboard.noEventsHint")}</span>
          <Link className="dashboard-empty-action" href="/events/new">
            {t(locale, "dashboard.createEvent")}
          </Link>
        </div>
      ) : (
        <div className="dashboard-my-events-list">
          {events.map((event) => {
            const primaryActivity = event.activities[0]?.activity ?? null;
            const activityNames = event.activities.map((item) =>
              localizeActivityName(locale, item.activity),
            );
            const title =
              activityNames.length > 0
                ? activityNames.join(", ")
                : t(locale, "dashboard.myEvents");
            const composition = `${t(locale, "events.roleTanks")} ${formatRange(
              event.tankMin,
              event.tankMax,
            )} · ${t(locale, "events.roleHealers")} ${formatRange(
              event.healerMin,
              event.healerMax,
            )} · ${t(locale, "events.roleDamage")} ${formatRange(
              event.damageMin,
              event.damageMax,
            )}`;

            return (
              <article className="dashboard-my-event-row" key={event.id}>
                <span className="dashboard-my-event-image" aria-hidden="true">
                  {primaryActivity?.artPath ? (
                    <Image src={primaryActivity.artPath} alt="" fill sizes="72px" />
                  ) : (
                    <Swords className="size-6" />
                  )}
                </span>

                <div className="dashboard-my-event-main">
                  <div className="dashboard-my-event-title">
                    <strong>{title}</strong>
                    <Badge className="dashboard-activity-type" variant="outline">
                      {getActivityTypeLabel(locale, event.activityType)}
                    </Badge>
                    <Badge className="dashboard-activity-status" variant="success">
                      {localizeDifficulty(locale, event.difficulty)}
                    </Badge>
                  </div>
                  <span>
                    <CalendarClock className="size-4" aria-hidden="true" />
                    {formatLocalDate(event.localDate)} {event.localTime} {event.timeZone}
                  </span>
                  <span>
                    <UsersRound className="size-4" aria-hidden="true" />
                    {t(locale, "dashboard.eventLeader")}: {event.leaderName}-{event.leaderRealm}
                  </span>
                  <span>{composition}</span>
                </div>

                <div className="dashboard-my-event-meta">
                  <span>
                    <Coins className="size-4" aria-hidden="true" />
                    {event.hasPaidSlots
                      ? `${event.paidSlots} · ${formatGold(event.paidSlotPrice, locale)}`
                      : t(locale, "dashboard.eventFree")}
                  </span>
                  <span>
                    <ScrollText className="size-4" aria-hidden="true" />
                    {getUnrollLabel(event, locale)}
                  </span>
                  <span>
                    <Radio className="size-4" aria-hidden="true" />
                    {event.publishTargets
                      .map((target) => getPublishTargetLabel(locale, target))
                      .join(", ")}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
