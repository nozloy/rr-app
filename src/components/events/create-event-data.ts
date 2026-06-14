import { CalendarDays, Globe2, Shield, Swords } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type {
  ActivityTab,
  EventInstanceOption,
  EventRole,
  PublishTargetField,
  RoleField,
  RoleRange,
  UnrollTemplate,
} from "./create-event-types";

export const addons = ["Midnight", "The War Within", "Dragonflight"] as const;
export type EventAddon = (typeof addons)[number];

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

const midnightOpenWorldActivities: LocalizedOpenWorld[] = [
  {
    activityType: "open-world",
    artPath: "/home/hero-midnight-citadel.jpg",
    names: {
      en: "Quel'Thalas contract runs",
      ru: "Контракты добычи Кель'Таласа",
    },
    shortNames: {
      en: "Contracts",
      ru: "Контракты",
    },
    slug: "quelthalas-prey-contracts",
  },
  {
    activityType: "open-world",
    artPath: "/raids/march_on_queldanas_styled_16x9.png",
    names: {
      en: "Silvermoon patrols",
      ru: "Патрули Серебряной Луны",
    },
    shortNames: {
      en: "Patrols",
      ru: "Патрули",
    },
    slug: "silvermoon-patrols",
  },
  {
    activityType: "open-world",
    artPath: "/raids/the_voidspire_styled_16x9.png",
    names: {
      en: "Void rifts",
      ru: "Разломы Бездны",
    },
    shortNames: {
      en: "Rifts",
      ru: "Разломы",
    },
    slug: "void-rifts",
  },
  {
    activityType: "open-world",
    artPath: "/raids/the_dreamrift_styled_16x9.png",
    names: {
      en: "Rare target hunt",
      ru: "Охота за редкими целями",
    },
    shortNames: {
      en: "Rares",
      ru: "Редкие цели",
    },
    slug: "rare-hunt",
  },
];

const warWithinOpenWorldActivities: LocalizedOpenWorld[] = [
  {
    activityType: "open-world",
    artPath: "/raids/nerubar_palace_styled_16x9.png",
    names: {
      en: "Azj-Kahet expeditions",
      ru: "Походы в Азж-Кахет",
    },
    shortNames: {
      en: "Azj-Kahet",
      ru: "Азж-Кахет",
    },
    slug: "azj-kahet-expeditions",
  },
  {
    activityType: "open-world",
    artPath: "/raids/liberation_of_undermine_styled_16x9.png",
    names: {
      en: "Undermine operations",
      ru: "Операции в Нижней Шахте",
    },
    shortNames: {
      en: "Undermine",
      ru: "Undermine",
    },
    slug: "undermine-operations",
  },
  {
    activityType: "open-world",
    artPath: "/raids/manaforge_omega_styled_16x9.png",
    names: {
      en: "Manaforge rifts",
      ru: "Разломы Манагорна",
    },
    shortNames: {
      en: "Manaforge",
      ru: "Манагорн",
    },
    slug: "manaforge-rifts",
  },
];

const dragonflightOpenWorldActivities: LocalizedOpenWorld[] = [
  {
    activityType: "open-world",
    artPath: "/raids/vault_of_the_incarnates_styled_16x9.png",
    names: {
      en: "Primalist hunts",
      ru: "Охота на первородных",
    },
    shortNames: {
      en: "Primalists",
      ru: "Праймалы",
    },
    slug: "primalist-hunts",
  },
  {
    activityType: "open-world",
    artPath: "/raids/aberrus_the_shadowed_crucible_styled_16x9.png",
    names: {
      en: "Aberrus rifts",
      ru: "Разломы Аберрия",
    },
    shortNames: {
      en: "Aberrus",
      ru: "Аберрий",
    },
    slug: "aberrus-rifts",
  },
  {
    activityType: "open-world",
    artPath: "/raids/amirdrassil_the_dreams_hope_styled_16x9.png",
    names: {
      en: "Dream assaults",
      ru: "Налёты во Сне",
    },
    shortNames: {
      en: "Dream",
      ru: "Сон",
    },
    slug: "dream-assaults",
  },
];

function getOpenWorldActivitiesByAddon(
  locale: AppLocale,
): Record<EventAddon, EventInstanceOption[]> {
  return {
    Dragonflight: dragonflightOpenWorldActivities.map((item) =>
      toOpenWorldOption(locale, item),
    ),
    Midnight: midnightOpenWorldActivities.map((item) =>
      toOpenWorldOption(locale, item),
    ),
    "The War Within": warWithinOpenWorldActivities.map((item) =>
      toOpenWorldOption(locale, item),
    ),
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
