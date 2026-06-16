import type { AppLocale } from "@/lib/i18n";

export type DungeonLocalizedNames = {
  en: string;
  ru: string;
};

export type DungeonDefinition = {
  slug: string;
  name: string;
  shortName: string;
  artPath: string;
  names: DungeonLocalizedNames;
};

const midnightDungeons: DungeonDefinition[] = [
  {
    slug: "magisters-terrace",
    name: "Терраса Магистров",
    shortName: "MT",
    artPath: "/dungeons/Magisters_Terrace_styled_16x9.jpg",
    names: {
      en: "Magister's Terrace",
      ru: "Терраса Магистров",
    },
  },
  {
    slug: "maisara-caverns",
    name: "Пещеры Майсары",
    shortName: "MC",
    artPath: "/dungeons/Maisara_Caverns_styled_16x9.jpg",
    names: {
      en: "Maisara Caverns",
      ru: "Пещеры Майсары",
    },
  },
  {
    slug: "nexus-point-xenas",
    name: "Узел Нексуса Зенас",
    shortName: "NPX",
    artPath: "/dungeons/Nexus_Point_Xenas_styled_16x9.jpg",
    names: {
      en: "Nexus-Point Xenas",
      ru: "Узел Нексуса Зенас",
    },
  },
  {
    slug: "windrunner-spire",
    name: "Шпиль Ветрокрылых",
    shortName: "WS",
    artPath: "/dungeons/windrunner_spire_styled_16x9.jpg",
    names: {
      en: "Windrunner Spire",
      ru: "Шпиль Ветрокрылых",
    },
  },
  {
    slug: "blinding-vale",
    name: "Слепящая долина",
    shortName: "BV",
    artPath: "/dungeons/blinding_vale_styled_16x9.jpg",
    names: {
      en: "The Blinding Vale",
      ru: "Слепящая долина",
    },
  },
  {
    slug: "den-of-nalorakk",
    name: "Берлога Налоракка",
    shortName: "DN",
    artPath: "/dungeons/den_of_nalorakk_styled_16x9.jpg",
    names: {
      en: "Den of Nalorakk",
      ru: "Берлога Налоракка",
    },
  },
  {
    slug: "murder-row",
    name: "Закоулок душегубов",
    shortName: "MR",
    artPath: "/dungeons/murder_row_styled_16x9.jpg",
    names: {
      en: "Murder Row",
      ru: "Закоулок душегубов",
    },
  },
  {
    slug: "voidscar-arena",
    name: "Арена Шрама Бездны",
    shortName: "VA",
    artPath: "/dungeons/voidscar_arena_styled_16x9.jpg",
    names: {
      en: "Voidscar Arena",
      ru: "Арена Шрама Бездны",
    },
  },
];

const legacySeasonDungeons: DungeonDefinition[] = [
  {
    slug: "algethar-academy",
    name: "Академия Алгет'ар",
    shortName: "AA",
    artPath: "/dungeons/Algethar_Academy_styled_16x9.jpg",
    names: {
      en: "Algeth'ar Academy",
      ru: "Академия Алгет'ар",
    },
  },
  {
    slug: "seat-of-the-triumvirate",
    name: "Престол Триумвирата",
    shortName: "SEAT",
    artPath: "/dungeons/The_Seat_of_the_Triumvirate_styled_16x9.jpg",
    names: {
      en: "Seat of the Triumvirate",
      ru: "Престол Триумвирата",
    },
  },
  {
    slug: "skyreach",
    name: "Небесный Путь",
    shortName: "SR",
    artPath: "/dungeons/Skyreach_styled_16x9.jpg",
    names: {
      en: "Skyreach",
      ru: "Небесный Путь",
    },
  },
  {
    slug: "pit-of-saron",
    name: "Яма Сарона",
    shortName: "POS",
    artPath: "/dungeons/Pit_of_Saron_styled_16x9.jpg",
    names: {
      en: "Pit of Saron",
      ru: "Яма Сарона",
    },
  },
];

export const currentExpansionDungeons = midnightDungeons;
export const currentSeasonDungeons: DungeonDefinition[] = [
  ...midnightDungeons.slice(0, 4),
  ...legacySeasonDungeons,
];
export const allDungeonInstances = [
  ...currentExpansionDungeons,
  ...legacySeasonDungeons,
];

export function getDungeonBySlug(slug: string) {
  return allDungeonInstances.find((dungeon) => dungeon.slug === slug);
}

export function getLocalizedDungeonName(
  dungeon: Pick<DungeonDefinition, "name" | "names">,
  locale: AppLocale,
) {
  return dungeon.names[locale] ?? dungeon.name;
}
