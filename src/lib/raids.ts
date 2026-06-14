import type { AppLocale } from "@/lib/i18n";

export type RaidLocalizedNames = {
  en: string;
  ru: string;
};

export type RaidDefinition = {
  slug: string;
  name: string;
  shortName: string;
  expansion: string;
  artPath: string;
  aliases: string[];
  names?: RaidLocalizedNames;
};

const pngRaidSlugs = new Set([
  "vault-of-the-incarnates",
  "aberrus-the-shadowed-crucible",
  "amirdrassil-the-dreams-hope",
  "nerubar-palace",
  "liberation-of-undermine",
  "manaforge-omega",
  "march-on-queldanas",
  "the-dreamrift",
  "the-voidspire",
  "sporefall",
]);

function raidArtPath(slug: string) {
  const extension = pngRaidSlugs.has(slug) ? "png" : "jpg";

  return `/raids/${slug.replaceAll("-", "_")}_styled_16x9.${extension}`;
}

export const legacyRaidInstances: RaidDefinition[] = [
  {
    slug: "molten-core",
    name: "Molten Core",
    shortName: "MC",
    expansion: "Classic",
    artPath: raidArtPath("molten-core"),
    aliases: ["Огненные Недра", "MC", "Ragnaros"],
  },
  {
    slug: "temple-of-ahnqiraj",
    name: "Temple of Ahn'Qiraj",
    shortName: "AQ40",
    expansion: "Classic",
    artPath: raidArtPath("temple-of-ahnqiraj"),
    aliases: ["Ahn'Qiraj", "Temple of AhnQiraj", "AQ40", "Ан'Кираж"],
  },
  {
    slug: "ruins-of-ahnqiraj",
    name: "Ruins of Ahn'Qiraj",
    shortName: "AQ20",
    expansion: "Classic",
    artPath: raidArtPath("ruins-of-ahnqiraj"),
    aliases: ["Ruins of AhnQiraj", "AQ20", "Руины Ан'Киража"],
  },
  {
    slug: "blackwing-lair",
    name: "Blackwing Lair",
    shortName: "BWL",
    expansion: "Classic",
    artPath: raidArtPath("blackwing-lair"),
    aliases: ["BWL", "Логово Крыла Тьмы", "Nefarian"],
  },
  {
    slug: "karazhan",
    name: "Karazhan",
    shortName: "Kara",
    expansion: "Burning Crusade",
    artPath: raidArtPath("karazhan"),
    aliases: ["Kara", "Каражан", "Prince Malchezaar"],
  },
  {
    slug: "gruuls-lair",
    name: "Gruul's Lair",
    shortName: "Gruul",
    expansion: "Burning Crusade",
    artPath: raidArtPath("gruuls-lair"),
    aliases: ["Gruuls Lair", "Логово Груула", "Gruul"],
  },
  {
    slug: "magtheridons-lair",
    name: "Magtheridon's Lair",
    shortName: "Magtheridon",
    expansion: "Burning Crusade",
    artPath: raidArtPath("magtheridons-lair"),
    aliases: ["Magtheridons Lair", "Логово Магтеридона", "Maggy"],
  },
  {
    slug: "serpentshrine-cavern",
    name: "Serpentshrine Cavern",
    shortName: "SSC",
    expansion: "Burning Crusade",
    artPath: raidArtPath("serpentshrine-cavern"),
    aliases: ["SSC", "Змеиное святилище", "Lady Vashj"],
  },
  {
    slug: "the-eye",
    name: "The Eye",
    shortName: "TK",
    expansion: "Burning Crusade",
    artPath: raidArtPath("the-eye"),
    aliases: ["Tempest Keep", "TK", "Крепость Бурь", "Kael'thas"],
  },
  {
    slug: "hyjal-summit",
    name: "Hyjal Summit",
    shortName: "Hyjal",
    expansion: "Burning Crusade",
    artPath: raidArtPath("hyjal-summit"),
    aliases: ["The Battle for Mount Hyjal", "Mount Hyjal", "Вершина Хиджала"],
  },
  {
    slug: "black-temple",
    name: "Black Temple",
    shortName: "BT",
    expansion: "Burning Crusade",
    artPath: raidArtPath("black-temple"),
    aliases: ["BT", "Черный храм", "Illidan"],
  },
  {
    slug: "sunwell-plateau",
    name: "Sunwell Plateau",
    shortName: "Sunwell",
    expansion: "Burning Crusade",
    artPath: raidArtPath("sunwell-plateau"),
    aliases: ["Плато Солнечного Колодца", "SWP", "Kil'jaeden"],
  },
  {
    slug: "vault-of-archavon",
    name: "Vault of Archavon",
    shortName: "VoA",
    expansion: "Wrath of the Lich King",
    artPath: raidArtPath("vault-of-archavon"),
    aliases: ["VoA", "Склеп Аркавона", "Archavon"],
  },
  {
    slug: "naxxramas",
    name: "Naxxramas",
    shortName: "Naxx",
    expansion: "Wrath of the Lich King",
    artPath: raidArtPath("naxxramas"),
    aliases: ["Naxx", "Наксрамас", "Kel'Thuzad"],
  },
  {
    slug: "the-obsidian-sanctum",
    name: "The Obsidian Sanctum",
    shortName: "OS",
    expansion: "Wrath of the Lich King",
    artPath: raidArtPath("the-obsidian-sanctum"),
    aliases: ["Obsidian Sanctum", "OS", "Обсидиановое святилище", "Sartharion"],
  },
  {
    slug: "the-eye-of-eternity",
    name: "The Eye of Eternity",
    shortName: "EoE",
    expansion: "Wrath of the Lich King",
    artPath: raidArtPath("the-eye-of-eternity"),
    aliases: ["Eye of Eternity", "EoE", "Око Вечности", "Malygos"],
  },
  {
    slug: "ulduar",
    name: "Ulduar",
    shortName: "Ulduar",
    expansion: "Wrath of the Lich King",
    artPath: raidArtPath("ulduar"),
    aliases: ["Ульдуар", "Yogg-Saron", "Yogg Saron"],
  },
  {
    slug: "trial-of-the-crusader",
    name: "Trial of the Crusader",
    shortName: "ToC",
    expansion: "Wrath of the Lich King",
    artPath: raidArtPath("trial-of-the-crusader"),
    aliases: ["ToC", "Испытание крестоносца", "Anub'arak"],
  },
  {
    slug: "onyxias-lair",
    name: "Onyxia's Lair",
    shortName: "Onyxia",
    expansion: "Wrath of the Lich King",
    artPath: raidArtPath("onyxias-lair"),
    aliases: ["Onyxias Lair", "Логово Ониксии", "Onyxia"],
  },
  {
    slug: "icecrown-citadel",
    name: "Icecrown Citadel",
    shortName: "ICC",
    expansion: "Wrath of the Lich King",
    artPath: raidArtPath("icecrown-citadel"),
    aliases: ["ICC", "Цитадель Ледяной Короны", "The Lich King"],
  },
  {
    slug: "the-ruby-sanctum",
    name: "The Ruby Sanctum",
    shortName: "RS",
    expansion: "Wrath of the Lich King",
    artPath: raidArtPath("the-ruby-sanctum"),
    aliases: ["Ruby Sanctum", "RS", "Рубиновое святилище", "Halion"],
  },
  {
    slug: "baradin-hold",
    name: "Baradin Hold",
    shortName: "BH",
    expansion: "Cataclysm",
    artPath: raidArtPath("baradin-hold"),
    aliases: ["BH", "Крепость Барадин", "Tol Barad"],
  },
  {
    slug: "blackwing-descent",
    name: "Blackwing Descent",
    shortName: "BWD",
    expansion: "Cataclysm",
    artPath: raidArtPath("blackwing-descent"),
    aliases: ["BWD", "Твердыня Крыла Тьмы", "Nefarian"],
  },
  {
    slug: "the-bastion-of-twilight",
    name: "The Bastion of Twilight",
    shortName: "BoT",
    expansion: "Cataclysm",
    artPath: raidArtPath("the-bastion-of-twilight"),
    aliases: ["Bastion of Twilight", "BoT", "Сумеречный бастион", "Cho'gall"],
  },
  {
    slug: "throne-of-the-four-winds",
    name: "Throne of the Four Winds",
    shortName: "Four Winds",
    expansion: "Cataclysm",
    artPath: raidArtPath("throne-of-the-four-winds"),
    aliases: ["ToFW", "Трон Четырех Ветров", "Al'Akir"],
  },
  {
    slug: "firelands",
    name: "Firelands",
    shortName: "Firelands",
    expansion: "Cataclysm",
    artPath: raidArtPath("firelands"),
    aliases: ["Огненные Просторы", "Firelands Raid", "Ragnaros"],
  },
  {
    slug: "dragon-soul",
    name: "Dragon Soul",
    shortName: "DS",
    expansion: "Cataclysm",
    artPath: raidArtPath("dragon-soul"),
    aliases: ["DS", "Душа Дракона", "Deathwing"],
  },
  {
    slug: "mogushan-vaults",
    name: "Mogu'shan Vaults",
    shortName: "MSV",
    expansion: "Mists of Pandaria",
    artPath: raidArtPath("mogushan-vaults"),
    aliases: ["Mogushan Vaults", "MSV", "Подземелья Могу'шан"],
  },
  {
    slug: "heart-of-fear",
    name: "Heart of Fear",
    shortName: "HoF",
    expansion: "Mists of Pandaria",
    artPath: raidArtPath("heart-of-fear"),
    aliases: ["HoF", "Сердце Страха", "Grand Empress Shek'zeer"],
  },
  {
    slug: "terrace-of-endless-spring",
    name: "Terrace of Endless Spring",
    shortName: "ToES",
    expansion: "Mists of Pandaria",
    artPath: raidArtPath("terrace-of-endless-spring"),
    aliases: ["ToES", "Терраса Вечной Весны", "Sha of Fear"],
  },
  {
    slug: "throne-of-thunder",
    name: "Throne of Thunder",
    shortName: "ToT",
    expansion: "Mists of Pandaria",
    artPath: raidArtPath("throne-of-thunder"),
    aliases: ["ToT", "Престол Гроз", "Lei Shen"],
  },
  {
    slug: "siege-of-orgrimmar",
    name: "Siege of Orgrimmar",
    shortName: "SoO",
    expansion: "Mists of Pandaria",
    artPath: raidArtPath("siege-of-orgrimmar"),
    aliases: ["SoO", "Осада Оргриммара", "Garrosh"],
  },
  {
    slug: "highmaul",
    name: "Highmaul",
    shortName: "Highmaul",
    expansion: "Warlords of Draenor",
    artPath: raidArtPath("highmaul"),
    aliases: ["Верховный Молот", "Imperator Mar'gok"],
  },
  {
    slug: "blackrock-foundry",
    name: "Blackrock Foundry",
    shortName: "BRF",
    expansion: "Warlords of Draenor",
    artPath: raidArtPath("blackrock-foundry"),
    aliases: ["BRF", "Литейная клана Черной горы", "Blackhand"],
  },
  {
    slug: "hellfire-citadel",
    name: "Hellfire Citadel",
    shortName: "HFC",
    expansion: "Warlords of Draenor",
    artPath: raidArtPath("hellfire-citadel"),
    aliases: ["HFC", "Цитадель Адского Пламени", "Archimonde"],
  },
  {
    slug: "the-emerald-nightmare",
    name: "The Emerald Nightmare",
    shortName: "EN",
    expansion: "Legion",
    artPath: raidArtPath("the-emerald-nightmare"),
    aliases: ["Emerald Nightmare", "EN", "Изумрудный Кошмар", "Xavius"],
  },
  {
    slug: "trial-of-valor",
    name: "Trial of Valor",
    shortName: "ToV",
    expansion: "Legion",
    artPath: raidArtPath("trial-of-valor"),
    aliases: ["ToV", "Испытание доблести", "Helya"],
  },
  {
    slug: "the-nighthold",
    name: "The Nighthold",
    shortName: "Nighthold",
    expansion: "Legion",
    artPath: raidArtPath("the-nighthold"),
    aliases: ["Nighthold", "Цитадель Ночи", "Gul'dan"],
  },
  {
    slug: "tomb-of-sargeras",
    name: "Tomb of Sargeras",
    shortName: "ToS",
    expansion: "Legion",
    artPath: raidArtPath("tomb-of-sargeras"),
    aliases: ["ToS", "Гробница Саргераса", "Kil'jaeden"],
  },
  {
    slug: "antorus-the-burning-throne",
    name: "Antorus, the Burning Throne",
    shortName: "Antorus",
    expansion: "Legion",
    artPath: raidArtPath("antorus-the-burning-throne"),
    aliases: ["Antorus", "Анторус", "Argus the Unmaker"],
  },
  {
    slug: "uldir",
    name: "Uldir",
    shortName: "Uldir",
    expansion: "Battle for Azeroth",
    artPath: raidArtPath("uldir"),
    aliases: ["Ульдир", "G'huun", "Ghuun"],
  },
  {
    slug: "battle-of-dazaralor",
    name: "Battle of Dazar'alor",
    shortName: "BoD",
    expansion: "Battle for Azeroth",
    artPath: raidArtPath("battle-of-dazaralor"),
    aliases: ["Battle of Dazaralor", "BoD", "Битва за Дазар'алор", "Jaina"],
  },
  {
    slug: "crucible-of-storms",
    name: "Crucible of Storms",
    shortName: "CoS",
    expansion: "Battle for Azeroth",
    artPath: raidArtPath("crucible-of-storms"),
    aliases: ["CoS", "Горнило Штормов", "Uu'nat"],
  },
  {
    slug: "the-eternal-palace",
    name: "The Eternal Palace",
    shortName: "Eternal Palace",
    expansion: "Battle for Azeroth",
    artPath: raidArtPath("the-eternal-palace"),
    aliases: ["Eternal Palace", "Вечный дворец", "Queen Azshara"],
  },
  {
    slug: "nyalotha-the-waking-city",
    name: "Ny'alotha, the Waking City",
    shortName: "Ny'alotha",
    expansion: "Battle for Azeroth",
    artPath: raidArtPath("nyalotha-the-waking-city"),
    aliases: ["Nyalotha", "Ny'alotha", "Пробуждающийся город", "N'Zoth"],
  },
  {
    slug: "castle-nathria",
    name: "Castle Nathria",
    shortName: "Nathria",
    expansion: "Shadowlands",
    artPath: raidArtPath("castle-nathria"),
    aliases: ["Замок Нафрия", "Nathria", "Sire Denathrius"],
  },
  {
    slug: "sanctum-of-domination",
    name: "Sanctum of Domination",
    shortName: "SoD",
    expansion: "Shadowlands",
    artPath: raidArtPath("sanctum-of-domination"),
    aliases: ["SoD", "Святилище Господства", "Sylvanas"],
  },
  {
    slug: "sepulcher-of-the-first-ones",
    name: "Sepulcher of the First Ones",
    shortName: "Sepulcher",
    expansion: "Shadowlands",
    artPath: raidArtPath("sepulcher-of-the-first-ones"),
    aliases: ["Sepulcher", "Гробница Предвечных", "The Jailer"],
  },
  {
    slug: "vault-of-the-incarnates",
    name: "Хранилище Воплощений",
    shortName: "Хранилище",
    expansion: "Dragonflight",
    artPath: raidArtPath("vault-of-the-incarnates"),
    names: {
      en: "Vault of the Incarnates",
      ru: "Хранилище Воплощений",
    },
    aliases: [
      "VotI",
      "Vault of the Incarnates",
      "Хранилище Воплощений",
      "Raszageth",
    ],
  },
  {
    slug: "aberrus-the-shadowed-crucible",
    name: "Аберрий, Затененное Горнило",
    shortName: "Аберрий",
    expansion: "Dragonflight",
    artPath: raidArtPath("aberrus-the-shadowed-crucible"),
    names: {
      en: "Aberrus, the Shadowed Crucible",
      ru: "Аберрий, Затененное Горнило",
    },
    aliases: [
      "Aberrus",
      "Aberrus, the Shadowed Crucible",
      "Аберрий",
      "Затененное Горнило",
      "Shadowed Crucible",
      "Sarkareth",
    ],
  },
  {
    slug: "amirdrassil-the-dreams-hope",
    name: "Амирдрассил, Надежда Сна",
    shortName: "Амирдрассил",
    expansion: "Dragonflight",
    artPath: raidArtPath("amirdrassil-the-dreams-hope"),
    names: {
      en: "Amirdrassil, the Dream's Hope",
      ru: "Амирдрассил, Надежда Сна",
    },
    aliases: [
      "Amirdrassil",
      "Amirdrassil, the Dream's Hope",
      "Амирдрассил",
      "Надежда Сна",
      "Dream's Hope",
      "Fyrakk",
    ],
  },
  {
    slug: "nerubar-palace",
    name: "Неруб'арский дворец",
    shortName: "Неруб'ар",
    expansion: "The War Within",
    artPath: raidArtPath("nerubar-palace"),
    names: {
      en: "Nerub'ar Palace",
      ru: "Неруб'арский дворец",
    },
    aliases: [
      "Nerub-ar Palace",
      "Nerub'ar Palace",
      "Nerubar Palace",
      "Неруб'арский дворец",
      "Queen Ansurek",
    ],
  },
  {
    slug: "liberation-of-undermine",
    name: "Освобождение Нижней Шахты",
    shortName: "Нижняя Шахта",
    expansion: "The War Within",
    artPath: raidArtPath("liberation-of-undermine"),
    names: {
      en: "Liberation of Undermine",
      ru: "Освобождение Нижней Шахты",
    },
    aliases: [
      "Liberation of Undermine",
      "Освобождение Нижней Шахты",
      "Undermine",
      "Gallywix",
    ],
  },
  {
    slug: "manaforge-omega",
    name: "Манагорн Омега",
    shortName: "Манагорн",
    expansion: "The War Within",
    artPath: raidArtPath("manaforge-omega"),
    names: {
      en: "Manaforge Omega",
      ru: "Манагорн Омега",
    },
    aliases: ["Manaforge Omega", "Manaforge: Omega", "Манагорн Омега", "Dimensius"],
  },
];

export const currentRaidInstances: RaidDefinition[] = [
  {
    slug: "march-on-queldanas",
    name: "Марш на Кель'Данас",
    shortName: "MQD",
    expansion: "Midnight",
    artPath: raidArtPath("march-on-queldanas"),
    names: {
      en: "March on Quel'Danas",
      ru: "Марш на Кель'Данас",
    },
    aliases: ["Марш на Кельданас", "March on Quel'Danas", "March on Queldanas"],
  },
  {
    slug: "the-dreamrift",
    name: "Провал снов",
    shortName: "DR",
    expansion: "Midnight",
    artPath: raidArtPath("the-dreamrift"),
    names: {
      en: "The Dreamrift",
      ru: "Провал снов",
    },
    aliases: ["Провалснов", "The Dreamrift", "Dreamrift"],
  },
  {
    slug: "the-voidspire",
    name: "Шпиль Бездны",
    shortName: "VS",
    expansion: "Midnight",
    artPath: raidArtPath("the-voidspire"),
    names: {
      en: "The Voidspire",
      ru: "Шпиль Бездны",
    },
    aliases: ["Шпильбездны", "The Voidspire", "Voidspire"],
  },
  {
    slug: "sporefall",
    name: "Споропад",
    shortName: "SF",
    expansion: "Midnight",
    artPath: raidArtPath("sporefall"),
    names: {
      en: "Sporefall",
      ru: "Споропад",
    },
    aliases: ["Споропад", "Sporefall", "Rotmire", "Гнилотоп"],
  },
];

export const allRaidInstances: RaidDefinition[] = [
  ...currentRaidInstances,
  ...legacyRaidInstances,
];

function normalizeRaidName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/giu, "");
}

function getRaidCandidates(raid: RaidDefinition) {
  return [
    raid.name,
    raid.names?.ru ?? "",
    raid.names?.en ?? "",
    raid.shortName,
    raid.slug,
    ...raid.aliases,
  ];
}

function findRaidByName(
  raids: RaidDefinition[],
  name: string | null | undefined,
) {
  if (!name) {
    return null;
  }

  const normalizedName = normalizeRaidName(name);

  const exactMatch = raids.find((raid) =>
    getRaidCandidates(raid).some(
      (candidate) => normalizeRaidName(candidate) === normalizedName,
    ),
  );

  if (exactMatch) {
    return exactMatch;
  }

  const containsMatches = raids.filter((raid) =>
    getRaidCandidates(raid).some((candidate) => {
      const normalizedCandidate = normalizeRaidName(candidate);
      return (
        normalizedCandidate.length >= 4 &&
        normalizedName.length >= 4 &&
        (normalizedName.includes(normalizedCandidate) ||
          normalizedCandidate.includes(normalizedName))
      );
    }),
  );

  return (
    containsMatches.sort((a, b) => b.name.length - a.name.length)[0] ?? null
  );
}

export function getRaidBySlug(slug: string) {
  return currentRaidInstances.find((raid) => raid.slug === slug);
}

export function getKnownRaidBySlug(slug: string) {
  return allRaidInstances.find((raid) => raid.slug === slug);
}

export function getRaidByName(name: string | null | undefined) {
  return findRaidByName(currentRaidInstances, name);
}

export function getKnownRaidByName(name: string | null | undefined) {
  return findRaidByName(allRaidInstances, name);
}

export function getLocalizedRaidName(
  raid: Pick<RaidDefinition, "name" | "names">,
  locale: AppLocale,
) {
  return raid.names?.[locale] ?? raid.name;
}
