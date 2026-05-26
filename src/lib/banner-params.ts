export type BannerType = "mythicPlus" | "raid";

export type BannerDraftInput = {
  bannerType: BannerType;
  characterId: string;
  dungeonSlug: string;
  raidSlug?: string;
  keystoneLevel: number;
  tankFilled: boolean;
  healerFilled: boolean;
  dpsFilled: number;
  raidTankNeeded: number;
  raidHealerNeeded: number;
  hasBloodlust: boolean;
  hasBattleRes: boolean;
};

export type PageSearchParams = Record<string, string | string[] | undefined>;

type BannerDraftDefaults = {
  characterId: string;
  dungeonSlug: string;
  raidSlug: string;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getBooleanParam(value: string | string[] | undefined) {
  const normalized = getFirstParam(value);

  return normalized === "1" || normalized === "true" || normalized === "on";
}

function getBannerTypeParam(value: string | string[] | undefined): BannerType {
  return getFirstParam(value) === "raid" ? "raid" : "mythicPlus";
}

function getIntParam(
  value: string | string[] | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(getFirstParam(value) ?? "", 10);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;

  return Math.max(min, Math.min(max, safeValue));
}

export function hasBannerDraftParams(searchParams: PageSearchParams) {
  return Boolean(getFirstParam(searchParams.characterId));
}

export function getBannerDraftFromPageParams(
  searchParams: PageSearchParams,
  defaults: BannerDraftDefaults,
): BannerDraftInput {
  return {
    bannerType: getBannerTypeParam(searchParams.bannerType),
    characterId: getFirstParam(searchParams.characterId) ?? defaults.characterId,
    dungeonSlug: getFirstParam(searchParams.dungeonSlug) ?? defaults.dungeonSlug,
    raidSlug: getFirstParam(searchParams.raidSlug) ?? defaults.raidSlug,
    keystoneLevel: getIntParam(searchParams.keystoneLevel, 10, 2, 30),
    tankFilled: getBooleanParam(searchParams.tankFilled),
    healerFilled: getBooleanParam(searchParams.healerFilled),
    dpsFilled: getIntParam(searchParams.dpsFilled, 1, 0, 3),
    raidTankNeeded: getIntParam(searchParams.raidTankNeeded, 0, 0, 2),
    raidHealerNeeded: getIntParam(searchParams.raidHealerNeeded, 0, 0, 10),
    hasBloodlust: getBooleanParam(searchParams.hasBloodlust),
    hasBattleRes: getBooleanParam(searchParams.hasBattleRes),
  };
}

export function getBannerDraftFromUrlParams(searchParams: URLSearchParams) {
  const characterId = searchParams.get("characterId");
  const bannerType = getBannerTypeParam(searchParams.get("bannerType") ?? undefined);
  const dungeonSlug = searchParams.get("dungeonSlug");
  const raidSlug = searchParams.get("raidSlug");

  if (
    !characterId ||
    (bannerType === "mythicPlus" && !dungeonSlug) ||
    (bannerType === "raid" && !raidSlug)
  ) {
    return null;
  }

  return getBannerDraftFromPageParams(
    {
      bannerType,
      characterId,
      dungeonSlug: dungeonSlug ?? undefined,
      raidSlug: raidSlug ?? undefined,
      keystoneLevel: searchParams.get("keystoneLevel") ?? undefined,
      tankFilled: searchParams.get("tankFilled") ?? undefined,
      healerFilled: searchParams.get("healerFilled") ?? undefined,
      dpsFilled: searchParams.get("dpsFilled") ?? undefined,
      raidTankNeeded: searchParams.get("raidTankNeeded") ?? undefined,
      raidHealerNeeded: searchParams.get("raidHealerNeeded") ?? undefined,
      hasBloodlust: searchParams.get("hasBloodlust") ?? undefined,
      hasBattleRes: searchParams.get("hasBattleRes") ?? undefined,
    },
    {
      characterId,
      dungeonSlug: dungeonSlug ?? "",
      raidSlug: raidSlug ?? "",
    },
  );
}

export function getBannerImageUrl(input: BannerDraftInput) {
  const searchParams = new URLSearchParams({
    bannerType: input.bannerType,
    characterId: input.characterId,
  });

  if (input.bannerType === "raid") {
    searchParams.set("raidSlug", input.raidSlug ?? "");
    searchParams.set("raidTankNeeded", String(input.raidTankNeeded));
    searchParams.set("raidHealerNeeded", String(input.raidHealerNeeded));

    return `/banners/image?${searchParams.toString()}`;
  }

  searchParams.set("dungeonSlug", input.dungeonSlug);
  searchParams.set("keystoneLevel", String(input.keystoneLevel));
  searchParams.set("dpsFilled", String(input.dpsFilled));

  if (input.tankFilled) {
    searchParams.set("tankFilled", "1");
  }

  if (input.healerFilled) {
    searchParams.set("healerFilled", "1");
  }

  if (input.hasBloodlust) {
    searchParams.set("hasBloodlust", "1");
  }

  if (input.hasBattleRes) {
    searchParams.set("hasBattleRes", "1");
  }

  return `/banners/image?${searchParams.toString()}`;
}
