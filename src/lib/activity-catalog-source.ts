export const eventAddonDefinitions = [
  {
    slug: "midnight",
    nameEn: "Midnight",
    nameRu: "Midnight",
    sortOrder: 0,
  },
  {
    slug: "the-war-within",
    nameEn: "The War Within",
    nameRu: "The War Within",
    sortOrder: 1,
  },
  {
    slug: "dragonflight",
    nameEn: "Dragonflight",
    nameRu: "Dragonflight",
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
] as const;

export const openWorldActivityDefinitions = [
  {
    slug: "farm",
    nameEn: "Farm",
    nameRu: "Фарм",
    shortNameEn: "Farm",
    shortNameRu: "Фарм",
    artPath: "/activities/farm_styled_16x9.jpg",
    sortOrder: 0,
  },
  {
    slug: "achievements",
    nameEn: "Achievements",
    nameRu: "Достижения",
    shortNameEn: "Achiev.",
    shortNameRu: "Ачивы",
    artPath: "/activities/achievements_styled_16x9.jpg",
    sortOrder: 1,
  },
] as const;

export const dungeonSlugsByAddonSlug: Record<EventAddonSeedSlug, string[]> = {
  dragonflight: ["algethar-academy"],
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

export const currentSeasonGroupDefinition = {
  slug: "current-season",
  nameEn: "Current season",
  nameRu: "Текущий сезон",
  sortOrder: 0,
} as const;
