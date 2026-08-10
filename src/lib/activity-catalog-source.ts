export const eventAddonDefinitions = [
  {
    slug: "midnight",
    nameEn: "Midnight",
    nameRu: "Midnight",
    artPath: "/home/hero-midnight-citadel.jpg",
    sortOrder: 0,
  },
  {
    slug: "the-war-within",
    nameEn: "The War Within",
    nameRu: "The War Within",
    artPath: null,
    sortOrder: 1,
  },
  {
    slug: "dragonflight",
    nameEn: "Dragonflight",
    nameRu: "Dragonflight",
    artPath: null,
    sortOrder: 2,
  },
] as const;

export type EventAddonSeedSlug = (typeof eventAddonDefinitions)[number]["slug"];

export const eventDifficultyDefinitions = [
  {
    slug: "normal",
    labelEn: "Normal",
    labelRu: "Нормал",
    sortOrder: 0,
  },
  {
    slug: "heroic",
    labelEn: "Heroic",
    labelRu: "Героик",
    sortOrder: 1,
  },
  {
    slug: "mythic",
    labelEn: "Mythic",
    labelRu: "Мифик",
    sortOrder: 2,
  },
  {
    slug: "flex-mythic",
    labelEn: "Flexible Mythic",
    labelRu: "Гибкий Мифический",
    sortOrder: 3,
  },
] as const;

export const openWorldActivityDefinitions = [
  {
    slug: "farm",
    nameEn: "Farm",
    nameRu: "Фарм",
    shortNameEn: "Farm",
    shortNameRu: "Фарм",
    artPath: "/activities/farm_styled_16x9.png",
    sortOrder: 0,
  },
  {
    slug: "achievements",
    nameEn: "Achievements",
    nameRu: "Достижения",
    shortNameEn: "Achiev.",
    shortNameRu: "Ачивы",
    artPath: "/activities/achievements_styled_16x9.png",
    sortOrder: 1,
  },
] as const;

export const dungeonSlugsByAddonSlug: Record<EventAddonSeedSlug, string[]> = {
  dragonflight: ["algethar-academy", "ruby-life-pools"],
  midnight: [
    "magisters-terrace",
    "maisara-caverns",
    "nexus-point-xenas",
    "windrunner-spire",
    "blinding-vale",
    "den-of-nalorakk",
    "murder-row",
    "voidscar-arena",
    "altar-of-fangs",
  ],
  "the-war-within": ["seat-of-the-triumvirate", "skyreach", "pit-of-saron"],
};

export const eventSeasonDefinitions = [
  {
    slug: "midnight-season-2",
    nameEn: "Season 2 · Midnight",
    nameRu: "Сезон 2 · Midnight",
    sortOrder: 0,
  },
  {
    slug: "midnight-season-1",
    nameEn: "Season 1 · Midnight",
    nameRu: "Сезон 1 · Midnight",
    sortOrder: 1,
  },
] as const;

export const currentSeasonGroupDefinition = eventSeasonDefinitions[0];

export const midnightSeasonOneRaidSlugs = [
  "march-on-queldanas",
  "the-dreamrift",
  "the-voidspire",
  "sporefall",
] as const;

export const midnightSeasonOneDungeonSlugs = [
  "magisters-terrace",
  "maisara-caverns",
  "nexus-point-xenas",
  "windrunner-spire",
  "algethar-academy",
  "seat-of-the-triumvirate",
  "skyreach",
  "pit-of-saron",
] as const;

export const midnightSeasonTwoDungeonSlugs = [
  "altar-of-fangs",
  "murder-row",
  "den-of-nalorakk",
  "blinding-vale",
  "voidscar-arena",
  "ruby-life-pools",
  "kings-rest",
  "temple-of-sethraliss",
] as const;

export const midnightSeasonTwoRaidSlugs = [
  "venomous-abyss",
  "tidebound-grotto",
] as const;
