import { currentSeasonDungeons, getDungeonBySlug } from "@/lib/dungeons";
import { t, type AppLocale } from "@/lib/i18n";
import {
  getLocalizedRaidName,
  getKnownRaidByName,
  getRaidByName,
  type RaidDefinition,
} from "@/lib/raids";

export const ADDON_EXPORT_PREFIX = "RR1?";
export const ADDON_QR_EXPORT_PREFIX = "RRQ1?";
export const MAX_ADDON_EXPORT_LENGTH = 12000;

export type AddonGroupType = "solo" | "party" | "raid";
export type AddonRole = "TANK" | "HEALER" | "DAMAGER" | "NONE";

export type AddonGroupMember = {
  classFile: string;
  role: AddonRole;
};

export type AddonRosterMember = AddonGroupMember & {
  name: string;
  realm: string;
};

export type AddonDraftOverrides = {
  dungeonSlug?: string;
  tankFilled?: boolean;
  healerFilled?: boolean;
  dpsFilled?: number;
  raidTankNeeded?: number;
  raidHealerNeeded?: number;
  hasBloodlust?: boolean;
  hasBattleRes?: boolean;
};

export type AddonExportData = {
  playerName: string;
  raidLeaderName: string | null;
  realm: string;
  classFile: string;
  className: string;
  spec: string | null;
  itemLevel: number;
  groupType: AddonGroupType;
  groupSize: number;
  members: AddonGroupMember[];
  roster: AddonRosterMember[];
  instanceType: string | null;
  instanceName: string | null;
  difficultyID: number | null;
  difficultyName: string | null;
  selectedRaidDifficultyID: number | null;
  selectedRaidDifficultyName: string | null;
  keyLevel: number | null;
  keyChallengeMapID: number | null;
  keyMapName: string | null;
  draft: AddonDraftOverrides;
};

export type ImportedBannerDraft = {
  source: AddonExportData;
  characterName: string;
  realm: string;
  classFile: string;
  className: string;
  spec: string | null;
  itemLevel: number;
  dungeonSlug: string;
  keystoneLevel: number;
  hasMythicPlusKey: boolean;
  tankFilled: boolean;
  healerFilled: boolean;
  dpsFilled: number;
  raidTankNeeded: number;
  raidHealerNeeded: number;
  hasBloodlust: boolean;
  hasBattleRes: boolean;
};

export type ImportedBannerVariant =
  | "mythicPlus"
  | "currentRaid"
  | "legacyRaid";

export type ImportedRaidDisplayMode = {
  bannerVariant: ImportedBannerVariant;
  raid: RaidDefinition | null;
  displayRaid: RaidDefinition | null;
  activityName: string;
  isLegacyRaid: boolean;
};

export const LEGACY_RAID_ACTIVITY_NAME = "Legacy raid";
export const LEGACY_RAID_GOAL_LABEL =
  "Идем за ачивами, маунтами и трансмогом";

export function getLegacyRaidActivityName(locale: AppLocale) {
  return t(locale, "addonExport.legacyRaidName");
}

export function getLegacyRaidGoalLabel(locale: AppLocale) {
  return t(locale, "addonExport.legacyRaidGoal");
}

const VALID_GROUP_TYPES = new Set<AddonGroupType>(["solo", "party", "raid"]);
const VALID_ROLES = new Set<AddonRole>(["TANK", "HEALER", "DAMAGER", "NONE"]);
const COMPACT_GROUP_TYPES: Record<string, AddonGroupType> = {
  s: "solo",
  p: "party",
  r: "raid",
};
const COMPACT_INSTANCE_TYPES: Record<string, string> = {
  n: "none",
  p: "party",
  r: "raid",
  s: "scenario",
  a: "arena",
  v: "pvp",
};
const COMPACT_CLASS_CODES: Record<string, string> = {
  DK: "DEATHKNIGHT",
  DH: "DEMONHUNTER",
  D: "DRUID",
  DR: "DRUID",
  EV: "EVOKER",
  H: "HUNTER",
  M: "MAGE",
  MO: "MONK",
  P: "PALADIN",
  PR: "PRIEST",
  R: "ROGUE",
  S: "SHAMAN",
  WL: "WARLOCK",
  WR: "WARRIOR",
};
const COMPACT_ROLE_CODES: Record<string, AddonRole> = {
  T: "TANK",
  H: "HEALER",
  D: "DAMAGER",
  N: "NONE",
};
const BLOODLUST_CLASSES = new Set(["EVOKER", "HUNTER", "MAGE", "SHAMAN"]);
const BATTLE_RES_CLASSES = new Set([
  "DEATHKNIGHT",
  "DRUID",
  "PALADIN",
  "WARLOCK",
]);

export class AddonExportParseError extends Error {}

function requireString(
  params: URLSearchParams,
  key: string,
  locale: AppLocale,
) {
  const value = params.get(key)?.trim();

  if (!value) {
    throw new AddonExportParseError(
      t(locale, "addonExport.missingField", { field: key }),
    );
  }

  return value;
}

function optionalString(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value ? value : null;
}

function optionalInt(
  params: URLSearchParams,
  key: string,
  min: number,
  max: number,
) {
  const raw = params.get(key);

  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(min, Math.min(max, parsed));
}

function optionalBoolean(params: URLSearchParams, key: string) {
  const raw = params.get(key);

  if (!raw) {
    return undefined;
  }

  return raw === "1" || raw === "true" || raw === "on";
}

function normalizeClassFile(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z]/g, "");
}

function parseGroupType(value: string | null): AddonGroupType {
  const normalized = value?.toLowerCase();

  return VALID_GROUP_TYPES.has(normalized as AddonGroupType)
    ? (normalized as AddonGroupType)
    : "solo";
}

function parseCompactGroupType(value: string | null): AddonGroupType {
  return value ? (COMPACT_GROUP_TYPES[value.toLowerCase()] ?? "solo") : "solo";
}

function parseCompactClassFile(value: string | null) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return COMPACT_CLASS_CODES[normalized] ?? normalizeClassFile(normalized);
}

function parseCompactRole(value: string | undefined): AddonRole {
  const normalized = value?.trim().toUpperCase() ?? "";
  return COMPACT_ROLE_CODES[normalized] ?? "NONE";
}

function parseMembers(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((part) => {
      const [classFile, role] = part.split(":");
      const normalizedClass = normalizeClassFile(classFile ?? "");
      const normalizedRole = (role ?? "NONE").trim().toUpperCase();

      if (!normalizedClass || !VALID_ROLES.has(normalizedRole as AddonRole)) {
        return null;
      }

      return {
        classFile: normalizedClass,
        role: normalizedRole as AddonRole,
      };
    })
    .filter((member): member is AddonGroupMember => Boolean(member));
}

function parseRoster(value: string | null) {
  if (!value) {
    return [];
  }

  const seen = new Set<string>();

  return value
    .split(",")
    .map((part) => {
      const [name, realm, classFile, role] = part.split(":");
      const normalizedName = name?.trim() ?? "";
      const normalizedRealm = realm?.trim() ?? "";
      const normalizedClass = normalizeClassFile(classFile ?? "");
      const normalizedRole = (role ?? "NONE").trim().toUpperCase();

      if (
        !normalizedName ||
        !normalizedRealm ||
        !normalizedClass ||
        !VALID_ROLES.has(normalizedRole as AddonRole)
      ) {
        return null;
      }

      const key = `${normalizedName.toLowerCase()}-${normalizedRealm.toLowerCase()}`;
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);

      return {
        name: normalizedName,
        realm: normalizedRealm,
        classFile: normalizedClass,
        role: normalizedRole as AddonRole,
      };
    })
    .filter((member): member is AddonRosterMember => Boolean(member));
}

function parseCompactMembers(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((part) => {
      const [classCode, roleCode] = part.split(":");
      const classFile = parseCompactClassFile(classCode ?? "");

      if (!classFile) {
        return null;
      }

      return {
        classFile,
        role: parseCompactRole(roleCode),
      };
    })
    .filter((member): member is AddonGroupMember => Boolean(member));
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/giu, "");
}

function inferDungeonSlug(exportData: AddonExportData) {
  const sourceName = exportData.keyMapName ?? exportData.instanceName;

  if (!sourceName) {
    return currentSeasonDungeons[0]?.slug ?? "";
  }

  const normalizedSource = normalizeSearchText(sourceName);
  const matchedDungeon = currentSeasonDungeons.find((dungeon) => {
    const names = [
      dungeon.name,
      dungeon.names.ru,
      dungeon.names.en,
      dungeon.shortName,
      dungeon.slug,
    ];
    return names.some((name) => normalizeSearchText(name) === normalizedSource);
  });

  return matchedDungeon?.slug ?? currentSeasonDungeons[0]?.slug ?? "";
}

function getRoleCounts(members: AddonGroupMember[]) {
  return {
    tanks: members.filter((member) => member.role === "TANK").length,
    healers: members.filter((member) => member.role === "HEALER").length,
    dps: members.filter((member) => member.role === "DAMAGER").length,
  };
}

function getKnownClasses(exportData: AddonExportData) {
  return new Set([
    normalizeClassFile(exportData.classFile),
    ...exportData.members.map((member) => member.classFile),
  ]);
}

function getBannerCharacterName(exportData: AddonExportData) {
  return exportData.groupType === "raid"
    ? (exportData.raidLeaderName ?? exportData.playerName)
    : exportData.playerName;
}

export function getImportedRaidDisplayMode(
  draft: Pick<ImportedBannerDraft, "source">,
  locale: AppLocale = "ru",
): ImportedRaidDisplayMode {
  if (draft.source.groupType !== "raid") {
    return {
      bannerVariant: "mythicPlus",
      raid: null,
      displayRaid: null,
      activityName: draft.source.keyMapName ?? getLegacyRaidActivityName(locale),
      isLegacyRaid: false,
    };
  }

  const raid = getRaidByName(draft.source.instanceName);
  const displayRaid = raid ?? getKnownRaidByName(draft.source.instanceName);

  if (raid) {
    return {
      bannerVariant: "currentRaid",
      raid,
      displayRaid: raid,
      activityName: getLocalizedRaidName(raid, locale),
      isLegacyRaid: false,
    };
  }

  return {
    bannerVariant: "legacyRaid",
    raid: null,
    displayRaid,
    activityName:
      (displayRaid ? getLocalizedRaidName(displayRaid, locale) : null) ??
      draft.source.instanceName ??
      getLegacyRaidActivityName(locale),
    isLegacyRaid: true,
  };
}

function parseFullAddonExport(
  params: URLSearchParams,
  locale: AppLocale,
): AddonExportData {
  const classFile = normalizeClassFile(
    requireString(params, "classFile", locale),
  );
  const itemLevel = optionalInt(params, "ilvl", 0, 999) ?? 0;
  const groupSize = optionalInt(params, "groupSize", 1, 40) ?? 1;
  const dungeonSlug = optionalString(params, "dungeonSlug") ?? undefined;

  return {
    playerName: requireString(params, "name", locale),
    raidLeaderName: optionalString(params, "raidLeaderName"),
    realm: requireString(params, "realm", locale),
    classFile,
    className: optionalString(params, "className") ?? classFile,
    spec: optionalString(params, "spec"),
    itemLevel,
    groupType: parseGroupType(params.get("groupType")),
    groupSize,
    members: parseMembers(params.get("members")),
    roster: parseRoster(params.get("roster")),
    instanceType: optionalString(params, "instanceType"),
    instanceName: optionalString(params, "instanceName"),
    difficultyID: optionalInt(params, "difficultyID", 0, 999),
    difficultyName: optionalString(params, "difficultyName"),
    selectedRaidDifficultyID: optionalInt(
      params,
      "selectedRaidDifficultyID",
      0,
      999,
    ),
    selectedRaidDifficultyName: optionalString(
      params,
      "selectedRaidDifficultyName",
    ),
    keyLevel: optionalInt(params, "keyLevel", 2, 30),
    keyChallengeMapID: optionalInt(params, "keyChallengeMapID", 0, 99999),
    keyMapName: optionalString(params, "keyMapName"),
    draft: {
      dungeonSlug:
        dungeonSlug && getDungeonBySlug(dungeonSlug) ? dungeonSlug : undefined,
      tankFilled: optionalBoolean(params, "tankFilled"),
      healerFilled: optionalBoolean(params, "healerFilled"),
      dpsFilled: optionalInt(params, "dpsFilled", 0, 3) ?? undefined,
      raidTankNeeded:
        optionalInt(params, "raidTankNeeded", 0, 2) ?? undefined,
      raidHealerNeeded:
        optionalInt(params, "raidHealerNeeded", 0, 10) ?? undefined,
      hasBloodlust: optionalBoolean(params, "hasBloodlust"),
      hasBattleRes: optionalBoolean(params, "hasBattleRes"),
    },
  };
}

function parseCompactAddonExport(
  params: URLSearchParams,
  locale: AppLocale,
): AddonExportData {
  const classFile = parseCompactClassFile(requireString(params, "c", locale));
  const itemLevel = optionalInt(params, "i", 0, 999) ?? 0;

  return {
    playerName: requireString(params, "n", locale),
    raidLeaderName: optionalString(params, "l"),
    realm: requireString(params, "r", locale),
    classFile,
    className: optionalString(params, "cl") ?? classFile,
    spec: optionalString(params, "s"),
    itemLevel,
    groupType: parseCompactGroupType(params.get("g")),
    groupSize: optionalInt(params, "z", 1, 40) ?? 1,
    members: parseCompactMembers(params.get("m")),
    roster: [],
    instanceType:
      COMPACT_INSTANCE_TYPES[params.get("t")?.toLowerCase() ?? ""] ??
      optionalString(params, "t"),
    instanceName: optionalString(params, "in"),
    difficultyID: optionalInt(params, "di", 0, 999),
    difficultyName: optionalString(params, "dn"),
    selectedRaidDifficultyID: optionalInt(params, "sr", 0, 999),
    selectedRaidDifficultyName: optionalString(params, "sn"),
    keyLevel: optionalInt(params, "kl", 2, 30),
    keyChallengeMapID: optionalInt(params, "km", 0, 99999),
    keyMapName: optionalString(params, "kn"),
    draft: {},
  };
}

export function parseAddonExportString(
  input: string,
  locale: AppLocale = "ru",
): AddonExportData {
  const trimmed = input.trim();

  if (trimmed.length > MAX_ADDON_EXPORT_LENGTH) {
    throw new AddonExportParseError(t(locale, "addonExport.tooLong"));
  }

  if (trimmed.startsWith(ADDON_EXPORT_PREFIX)) {
    return parseFullAddonExport(
      new URLSearchParams(trimmed.slice(ADDON_EXPORT_PREFIX.length)),
      locale,
    );
  }

  if (trimmed.startsWith(ADDON_QR_EXPORT_PREFIX)) {
    return parseCompactAddonExport(
      new URLSearchParams(trimmed.slice(ADDON_QR_EXPORT_PREFIX.length)),
      locale,
    );
  }

  throw new AddonExportParseError(t(locale, "addonExport.invalidPrefix"));
}

export function getImportedBannerDraftFromExport(
  exportData: AddonExportData,
): ImportedBannerDraft {
  const roleCounts = getRoleCounts(exportData.members);
  const knownClasses = getKnownClasses(exportData);
  const detectedBloodlust = [...knownClasses].some((classFile) =>
    BLOODLUST_CLASSES.has(classFile),
  );
  const detectedBattleRes = [...knownClasses].some((classFile) =>
    BATTLE_RES_CLASSES.has(classFile),
  );

  return {
    source: exportData,
    characterName: getBannerCharacterName(exportData),
    realm: exportData.realm,
    classFile: exportData.classFile,
    className: exportData.className,
    spec: exportData.spec,
    itemLevel: exportData.itemLevel,
    dungeonSlug: exportData.draft.dungeonSlug ?? inferDungeonSlug(exportData),
    keystoneLevel: exportData.keyLevel ?? 10,
    hasMythicPlusKey: exportData.keyLevel !== null,
    tankFilled: exportData.draft.tankFilled ?? roleCounts.tanks > 0,
    healerFilled: exportData.draft.healerFilled ?? roleCounts.healers > 0,
    dpsFilled: exportData.draft.dpsFilled ?? Math.min(3, roleCounts.dps),
    raidTankNeeded: exportData.draft.raidTankNeeded ?? 0,
    raidHealerNeeded: exportData.draft.raidHealerNeeded ?? 0,
    hasBloodlust: exportData.draft.hasBloodlust ?? detectedBloodlust,
    hasBattleRes: exportData.draft.hasBattleRes ?? detectedBattleRes,
  };
}

export function serializeImportedBannerDraft(draft: ImportedBannerDraft) {
  const isRaid = draft.source.groupType === "raid";
  const params = new URLSearchParams({
    name: isRaid ? draft.source.playerName : draft.characterName,
    realm: draft.realm,
    classFile: draft.classFile,
    className: draft.className,
    ilvl: String(draft.itemLevel),
    groupType: draft.source.groupType,
    groupSize: String(draft.source.groupSize),
    dungeonSlug: draft.dungeonSlug,
    keyLevel: String(draft.keystoneLevel),
    tankFilled: draft.tankFilled ? "1" : "0",
    healerFilled: draft.healerFilled ? "1" : "0",
    dpsFilled: String(draft.dpsFilled),
    raidTankNeeded: String(draft.raidTankNeeded),
    raidHealerNeeded: String(draft.raidHealerNeeded),
    hasBloodlust: draft.hasBloodlust ? "1" : "0",
    hasBattleRes: draft.hasBattleRes ? "1" : "0",
  });

  if (draft.spec) {
    params.set("spec", draft.spec);
  }

  if (isRaid) {
    params.set("raidLeaderName", draft.characterName);
  }

  if (draft.source.members.length > 0) {
    params.set(
      "members",
      draft.source.members
        .map((member) => `${member.classFile}:${member.role}`)
        .join(","),
    );
  }

  const optionalFields = [
    ["instanceType", draft.source.instanceType],
    ["instanceName", draft.source.instanceName],
    ["difficultyName", draft.source.difficultyName],
    ["selectedRaidDifficultyName", draft.source.selectedRaidDifficultyName],
    ["keyMapName", draft.source.keyMapName],
  ] as const;

  optionalFields.forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const optionalNumbers = [
    ["difficultyID", draft.source.difficultyID],
    ["selectedRaidDifficultyID", draft.source.selectedRaidDifficultyID],
    ["keyChallengeMapID", draft.source.keyChallengeMapID],
  ] as const;

  optionalNumbers.forEach(([key, value]) => {
    if (value !== null) {
      params.set(key, String(value));
    }
  });

  return `${ADDON_EXPORT_PREFIX}${params.toString()}`;
}

export function getImportedBannerImageUrl(draft: ImportedBannerDraft) {
  const params = new URLSearchParams({
    data: serializeImportedBannerDraft(draft),
  });

  return `/banners/import/image?${params.toString()}`;
}
