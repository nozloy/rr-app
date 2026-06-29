import { CalendarDays, Globe2, Shield, Swords } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { openWorldActivityDefinitions } from "@/lib/activity-catalog-source";
import type {
  ActivityTab,
  DifficultyOption,
  EventDifficulty,
  EventInstanceOption,
  EventRole,
  PublishTargetField,
  RoleField,
  RoleRange,
  UnrollTemplate,
} from "./create-event-types";

export const addons = ["Midnight", "The War Within", "Dragonflight"] as const;
export type EventAddon = (typeof addons)[number];
export const eventDifficulties = [
  "normal",
  "heroic",
  "mythic",
] as const satisfies readonly EventDifficulty[];

export function resolveEventAddon(addon: string): EventAddon {
  return addons.includes(addon as EventAddon) ? (addon as EventAddon) : "Midnight";
}

export function getCalendarMonthNames(locale: AppLocale) {
  return locale === "ru"
    ? [
        "Январь",
        "Февраль",
        "Март",
        "Апрель",
        "Май",
        "Июнь",
        "Июль",
        "Август",
        "Сентябрь",
        "Октябрь",
        "Ноябрь",
        "Декабрь",
      ]
    : [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
}

export function getCalendarWeekdays(locale: AppLocale) {
  return locale === "ru"
    ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}

export const calendarMonthNames = getCalendarMonthNames("ru");
export const calendarWeekdays = getCalendarWeekdays("ru");

export const timeHours = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);

export const timeMinutes = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);

export function getActivityTabs(locale: AppLocale): ActivityTab[] {
  return [
    { icon: Swords, label: t(locale, "events.typeRaid"), type: "raid" },
    { icon: Shield, label: t(locale, "events.typeDungeon"), type: "dungeon" },
    { icon: CalendarDays, label: t(locale, "events.typeSeason"), type: "season" },
    { icon: Globe2, label: t(locale, "events.typeWorld"), type: "open-world" },
  ];
}

export const activityTabs = getActivityTabs("ru");

export function getDifficultyOptions(locale: AppLocale): DifficultyOption[] {
  return eventDifficulties.map((difficulty) => ({
    difficulty,
    label: t(locale, `events.difficulty${capitalizeDifficulty(difficulty)}`),
  }));
}

function capitalizeDifficulty(difficulty: EventDifficulty) {
  return `${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`;
}

type LocalizedOpenWorld = Omit<EventInstanceOption, "name" | "shortName" | "tag"> & {
  names: Record<AppLocale, string>;
  shortNames: Record<AppLocale, string>;
};

function toOpenWorldOption(
  locale: AppLocale,
  source: LocalizedOpenWorld,
): EventInstanceOption {
  return {
    activityType: source.activityType,
    artPath: source.artPath,
    name: source.names[locale],
    shortName: source.shortNames[locale],
    slug: source.slug,
    tag: t(locale, "events.typeWorld").toUpperCase(),
  };
}

const openWorldActivities: LocalizedOpenWorld[] = openWorldActivityDefinitions.map(
  (activity) => ({
    activityType: "open-world",
    artPath: activity.artPath,
    names: {
      en: activity.nameEn,
      ru: activity.nameRu,
    },
    shortNames: {
      en: activity.shortNameEn,
      ru: activity.shortNameRu,
    },
    slug: activity.slug,
  }),
);

function getOpenWorldActivitiesByAddon(
  locale: AppLocale,
): Record<EventAddon, EventInstanceOption[]> {
  const activities = openWorldActivities.map((item) =>
    toOpenWorldOption(locale, item),
  );

  return {
    Dragonflight: activities,
    Midnight: activities,
    "The War Within": activities,
  };
}

export const openWorldActivitiesByAddon = getOpenWorldActivitiesByAddon("ru");

export function getOpenWorldActivitiesForAddon(
  addon: EventAddon,
  locale: AppLocale,
) {
  return getOpenWorldActivitiesByAddon(locale)[addon];
}

export const unrollTemplates: UnrollTemplate[] = [
  // Built-in templates are disabled for now; only "No template" remains in UI.
];

export function getRoleFields(locale: AppLocale): RoleField[] {
  return [
    {
      imageSrc: "/roles/tank-clean.png",
      key: "tank",
      label: t(locale, "events.roleTanks"),
      placeholder: t(locale, "events.rolePlaceholderTank"),
    },
    {
      imageSrc: "/roles/healer-clean.png",
      key: "healer",
      label: t(locale, "events.roleHealers"),
      placeholder: t(locale, "events.rolePlaceholderHealer"),
    },
    {
      imageSrc: "/roles/dps-clean.png",
      key: "damage",
      label: t(locale, "events.roleDamage"),
      placeholder: t(locale, "events.rolePlaceholderDamage"),
    },
  ];
}

export const roleFields = getRoleFields("ru");

export const defaultRoleRanges: Record<EventRole, RoleRange> = {
  damage: { max: 12, min: 9 },
  healer: { max: 3, min: 3 },
  tank: { max: 2, min: 2 },
};

export function getPublishTargetFields(locale: AppLocale): PublishTargetField[] {
  return [
    {
      icon: "discord",
      key: "discord",
      label: "Discord",
      note: locale === "ru" ? "Канал сервера" : "Server channel",
    },
    {
      icon: "telegram",
      key: "telegram",
      label: "Telegram",
      note: locale === "ru" ? "Пост в чат" : "Chat post",
    },
    {
      icon: "app",
      imageSrc: "/home/raid-reminder-mark.png",
      key: "app",
      label: locale === "ru" ? "Приложение" : "App",
      note: "Raid Reminder",
    },
    {
      icon: "custom",
      key: "custom",
      label: locale === "ru" ? "Свои каналы" : "Custom channels",
      note:
        locale === "ru"
          ? "Пользовательские площадки"
          : "User-defined platforms",
    },
  ];
}

export const publishTargetFields = getPublishTargetFields("ru");
