import type { Account } from "@prisma/client";
import type {
  BlizzardCharacterMedia,
  BlizzardCharacterProfile,
  BlizzardCharacterSummary,
  BlizzardEquipmentSummary,
} from "@/lib/blizzard-mappers";
import { getRuntimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getRealmCodeEntryByRealmName } from "@/lib/realm-codes";
import { toBattleNetSlug } from "@/lib/utils";

export type BlizzardRegion = "eu" | "us";

const REGION_CONFIG = {
  eu: {
    apiBase: "https://eu.api.blizzard.com",
    armoryBase: "https://worldofwarcraft.blizzard.com/ru-ru/character/eu",
    dynamicNamespace: "dynamic-eu",
    locales: ["ru_RU", "en_GB"] as const,
    oauthBase: "https://eu.battle.net",
    profileNamespace: "profile-eu",
  },
  us: {
    apiBase: "https://us.api.blizzard.com",
    armoryBase: "https://worldofwarcraft.blizzard.com/en-us/character/us",
    dynamicNamespace: "dynamic-us",
    locales: ["en_US"] as const,
    oauthBase: "https://us.battle.net",
    profileNamespace: "profile-us",
  },
} satisfies Record<
  BlizzardRegion,
  {
    apiBase: string;
    armoryBase: string;
    dynamicNamespace: string;
    locales: readonly string[];
    oauthBase: string;
    profileNamespace: string;
  }
>;
const DEFAULT_REGION: BlizzardRegion = "eu";
const TOKEN_REFRESH_BUFFER_MS = 60_000;

type AccountProfileSummary = {
  wow_accounts?: Array<{
    id?: number;
    characters?: BlizzardCharacterSummary[];
  }>;
};

type RefreshTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

type ApplicationTokenCache = {
  accessToken: string;
  expiresAt: number;
};

type RealmIndex = {
  realms?: Array<{
    id?: number;
    name?: string;
    slug?: string;
  }>;
};

export type PublicCharacterSummary = {
  itemLevel: number | null;
  activeSpec: string | null;
};

export type BlizzardRaidEncounterProgress = {
  completed_count?: number;
  last_kill_timestamp?: number;
  encounter?: {
    id?: number;
    name?: string;
  };
};

export type BlizzardRaidEncounterMode = {
  difficulty?: {
    type?: string;
    name?: string;
  };
  progress?: {
    completed_count?: number;
    total_count?: number;
    encounters?: BlizzardRaidEncounterProgress[];
  };
  encounters?: BlizzardRaidEncounterProgress[];
};

export type BlizzardRaidEncounterInstance = {
  instance?: {
    id?: number;
    name?: string;
  };
  modes?: BlizzardRaidEncounterMode[];
};

export type BlizzardCharacterRaidEncounters = {
  expansions?: Array<{
    expansion?: {
      id?: number;
      name?: string;
    };
    instances?: BlizzardRaidEncounterInstance[];
  }>;
};

export class BattleNetAuthError extends Error {}
export class BlizzardApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const applicationTokenCache = new Map<BlizzardRegion, ApplicationTokenCache>();
const realmSlugCache = new Map<string, string>();
const realmIndexCache = new Map<string, RealmIndex["realms"]>();

async function parseError(response: Response) {
  const text = await response.text();
  return text || response.statusText;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeRealmLookup(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/giu, "");
}

function toBattleNetCharacterPath(value: string) {
  return encodeURIComponent(value.trim().toLocaleLowerCase("en-US"));
}

async function refreshAccessToken(account: Account) {
  const env = getRuntimeEnv();

  if (!account.refresh_token) {
    throw new BattleNetAuthError("У Battle.net-аккаунта нет refresh token.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: account.refresh_token,
  });

  const response = await fetch(`${REGION_CONFIG.eu.oauthBase}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${env.BATTLENET_CLIENT_ID}:${env.BATTLENET_CLIENT_SECRET}`,
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new BattleNetAuthError(await parseError(response));
  }

  const token = (await response.json()) as RefreshTokenResponse;

  return prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? account.refresh_token,
      expires_at: token.expires_in
        ? Math.floor(Date.now() / 1000) + token.expires_in
        : account.expires_at,
      token_type: token.token_type ?? account.token_type,
      scope: token.scope ?? account.scope,
    },
  });
}

export async function getApplicationAccessToken(region: BlizzardRegion = DEFAULT_REGION) {
  const cached = applicationTokenCache.get(region);
  if (
    cached &&
    cached.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS
  ) {
    return cached.accessToken;
  }

  const config = REGION_CONFIG[region];
  const env = getRuntimeEnv();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
  });

  const response = await fetch(`${config.oauthBase}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${env.BATTLENET_CLIENT_ID}:${env.BATTLENET_CLIENT_SECRET}`,
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new BattleNetAuthError(await parseError(response));
  }

  const token = (await response.json()) as RefreshTokenResponse;
  applicationTokenCache.set(region, {
    accessToken: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 0) * 1000,
  });

  return token.access_token;
}

export async function getBattleNetAccount(userId: string) {
  return prisma.account.findFirst({
    where: {
      userId,
      provider: "battlenet",
    },
  });
}

export async function getValidAccessToken(userId: string) {
  const account = await getBattleNetAccount(userId);

  if (!account?.access_token) {
    throw new BattleNetAuthError("Battle.net не подключен.");
  }

  const expiresSoon =
    typeof account.expires_at === "number" &&
    account.expires_at <= Math.floor(Date.now() / 1000) + 60;

  if (expiresSoon) {
    const refreshed = await refreshAccessToken(account);
    return refreshed.access_token ?? account.access_token;
  }

  return account.access_token;
}

async function blizzardRequest<T>(
  path: string,
  accessToken: string,
  region: BlizzardRegion = DEFAULT_REGION,
  locales: readonly string[] = REGION_CONFIG[region].locales,
) {
  const config = REGION_CONFIG[region];
  let lastError: Error | null = null;

  for (const locale of locales) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(
      `${config.apiBase}${path}${separator}namespace=${config.profileNamespace}&locale=${locale}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status === 401 || response.status === 403) {
      throw new BattleNetAuthError(await parseError(response));
    }

    lastError = new BlizzardApiRequestError(
      await parseError(response),
      response.status,
    );
  }

  throw lastError ?? new Error("Blizzard API request failed.");
}

async function blizzardDataRequest<T>(
  path: string,
  accessToken: string,
  region: BlizzardRegion = DEFAULT_REGION,
  namespace = REGION_CONFIG[region].dynamicNamespace,
  locales: readonly string[] = REGION_CONFIG[region].locales,
) {
  const config = REGION_CONFIG[region];
  let lastError: Error | null = null;

  for (const locale of locales) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(
      `${config.apiBase}${path}${separator}namespace=${namespace}&locale=${locale}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status === 401 || response.status === 403) {
      throw new BattleNetAuthError(await parseError(response));
    }

    lastError = new BlizzardApiRequestError(
      await parseError(response),
      response.status,
    );
  }

  throw lastError ?? new Error("Blizzard API request failed.");
}

export async function fetchAccountCharacters(accessToken: string) {
  const summary = await blizzardRequest<AccountProfileSummary>(
    "/profile/user/wow",
    accessToken,
    DEFAULT_REGION,
    ["ru_RU"],
  );

  return summary.wow_accounts?.flatMap((account) => account.characters ?? []) ?? [];
}

export async function fetchCharacterProfile(
  accessToken: string,
  realmSlug: string,
  characterName: string,
  region: BlizzardRegion = DEFAULT_REGION,
) {
  return blizzardRequest<BlizzardCharacterProfile>(
    `/profile/wow/character/${realmSlug}/${toBattleNetCharacterPath(characterName)}`,
    accessToken,
    region,
  );
}

export async function fetchCharacterEquipment(
  accessToken: string,
  realmSlug: string,
  characterName: string,
  region: BlizzardRegion = DEFAULT_REGION,
) {
  return blizzardRequest<BlizzardEquipmentSummary>(
    `/profile/wow/character/${realmSlug}/${toBattleNetCharacterPath(characterName)}/equipment`,
    accessToken,
    region,
  );
}

export async function fetchCharacterMedia(
  accessToken: string,
  realmSlug: string,
  characterName: string,
  region: BlizzardRegion = DEFAULT_REGION,
) {
  return blizzardRequest<BlizzardCharacterMedia>(
    `/profile/wow/character/${realmSlug}/${toBattleNetCharacterPath(characterName)}/character-media`,
    accessToken,
    region,
  );
}

export async function fetchCharacterRaidEncounters(
  accessToken: string,
  realmSlug: string,
  characterName: string,
  region: BlizzardRegion = DEFAULT_REGION,
) {
  return blizzardRequest<BlizzardCharacterRaidEncounters>(
    `/profile/wow/character/${realmSlug}/${toBattleNetCharacterPath(characterName)}/encounters/raids`,
    accessToken,
    region,
  );
}

export function getBlizzardArmoryUrl(
  realmSlug: string,
  characterName: string,
  region: BlizzardRegion = DEFAULT_REGION,
) {
  const config = REGION_CONFIG[region];

  return `${config.armoryBase}/${encodeURIComponent(
    realmSlug.trim().toLowerCase(),
  )}/${encodeURIComponent(characterName.trim())}`;
}

async function fetchRealmIndex(
  accessToken: string,
  locale: string,
  region: BlizzardRegion = DEFAULT_REGION,
) {
  const cacheKey = `${region}:${locale}`;
  const cached = realmIndexCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const index = await blizzardDataRequest<RealmIndex>(
    "/data/wow/realm/index",
    accessToken,
    region,
    REGION_CONFIG[region].dynamicNamespace,
    [locale],
  );
  const realms = index.realms ?? [];
  realmIndexCache.set(cacheKey, realms);

  return realms;
}

export async function resolveRealmSlug(
  accessToken: string,
  realmName: string,
  region: BlizzardRegion = DEFAULT_REGION,
) {
  const lookupKey = normalizeRealmLookup(realmName);
  const cacheKey = `${region}:${lookupKey}`;
  const cached = realmSlugCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const localRealm = getRealmCodeEntryByRealmName(region, realmName);
  if (localRealm) {
    realmSlugCache.set(cacheKey, localRealm.slug);
    return localRealm.slug;
  }

  for (const locale of REGION_CONFIG[region].locales) {
    const realms = await fetchRealmIndex(accessToken, locale, region);
    const match = realms.find((realm) => {
      if (!realm.name || !realm.slug) {
        return false;
      }

      return (
        normalizeRealmLookup(realm.name) === lookupKey ||
        normalizeRealmLookup(realm.slug) === lookupKey
      );
    });

    if (match?.slug) {
      realmSlugCache.set(cacheKey, match.slug);
      return match.slug;
    }
  }

  const fallbackSlug = toBattleNetSlug(realmName);
  if (fallbackSlug) {
    realmSlugCache.set(cacheKey, fallbackSlug);
    return fallbackSlug;
  }

  return null;
}

export async function fetchPublicCharacterSummary(
  realmSlug: string,
  characterName: string,
  region: BlizzardRegion = DEFAULT_REGION,
): Promise<PublicCharacterSummary> {
  const config = REGION_CONFIG[region];
  const url = `${config.armoryBase}/${realmSlug}/${encodeURIComponent(characterName)}`;
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      itemLevel: null,
      activeSpec: null,
    };
  }

  const html = await response.text();
  const escapedName = escapeRegExp(characterName);
  const escapedRealmSlug = escapeRegExp(realmSlug);
  const itemLevelMatch =
    html.match(
      /<meta\s+name="description"\s+content="[^"]*?,\s*(\d+)\s+(?:ilvl|ур\.\s*предметов)"/i,
    ) ??
    html.match(/,\s*(\d+)\s+(?:ilvl|ур\.\s*предметов)/i);
  const specMatch = html.match(
    new RegExp(
      `"averageItemLevel":\\d+,"class":\\{[^}]+\\},"name":"${escapedName}","race":\\{[^}]+\\},"realm":\\{"name":"[^"]+","slug":"${escapedRealmSlug}"\\},"region":"${region}","spec":\\{"enum":"[^"]+","id":\\d+,"name":"([^"]+)"`,
      "u",
    ),
  );

  return {
    itemLevel: itemLevelMatch ? Number(itemLevelMatch[1]) : null,
    activeSpec: specMatch?.[1] ?? null,
  };
}
