import type { Account } from "@prisma/client";
import type {
  BlizzardCharacterMedia,
  BlizzardCharacterProfile,
  BlizzardCharacterSummary,
  BlizzardEquipmentSummary,
} from "@/lib/blizzard-mappers";
import { getRuntimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { toBattleNetSlug } from "@/lib/utils";

const API_BASE = "https://eu.api.blizzard.com";
const OAUTH_BASE = "https://eu.battle.net";
const ARMORY_BASE = "https://worldofwarcraft.blizzard.com/ru-ru/character/eu";
const LOCALES = ["ru_RU", "en_GB"] as const;
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

let applicationTokenCache: ApplicationTokenCache | null = null;
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

  const response = await fetch(`${OAUTH_BASE}/oauth/token`, {
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

export async function getApplicationAccessToken() {
  if (
    applicationTokenCache &&
    applicationTokenCache.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS
  ) {
    return applicationTokenCache.accessToken;
  }

  const env = getRuntimeEnv();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
  });

  const response = await fetch(`${OAUTH_BASE}/oauth/token`, {
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
  applicationTokenCache = {
    accessToken: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 0) * 1000,
  };

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
  locales: readonly string[] = LOCALES,
) {
  let lastError: Error | null = null;

  for (const locale of locales) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(
      `${API_BASE}${path}${separator}namespace=profile-eu&locale=${locale}`,
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
  namespace = "dynamic-eu",
  locales: readonly string[] = LOCALES,
) {
  let lastError: Error | null = null;

  for (const locale of locales) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(
      `${API_BASE}${path}${separator}namespace=${namespace}&locale=${locale}`,
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
    ["ru_RU"],
  );

  return summary.wow_accounts?.flatMap((account) => account.characters ?? []) ?? [];
}

export async function fetchCharacterProfile(
  accessToken: string,
  realmSlug: string,
  characterName: string,
) {
  return blizzardRequest<BlizzardCharacterProfile>(
    `/profile/wow/character/${realmSlug}/${toBattleNetCharacterPath(characterName)}`,
    accessToken,
  );
}

export async function fetchCharacterEquipment(
  accessToken: string,
  realmSlug: string,
  characterName: string,
) {
  return blizzardRequest<BlizzardEquipmentSummary>(
    `/profile/wow/character/${realmSlug}/${toBattleNetCharacterPath(characterName)}/equipment`,
    accessToken,
  );
}

export async function fetchCharacterMedia(
  accessToken: string,
  realmSlug: string,
  characterName: string,
) {
  return blizzardRequest<BlizzardCharacterMedia>(
    `/profile/wow/character/${realmSlug}/${toBattleNetCharacterPath(characterName)}/character-media`,
    accessToken,
  );
}

export async function fetchCharacterRaidEncounters(
  accessToken: string,
  realmSlug: string,
  characterName: string,
) {
  return blizzardRequest<BlizzardCharacterRaidEncounters>(
    `/profile/wow/character/${realmSlug}/${toBattleNetCharacterPath(characterName)}/encounters/raids`,
    accessToken,
  );
}

async function fetchRealmIndex(accessToken: string, locale: string) {
  const cached = realmIndexCache.get(locale);
  if (cached) {
    return cached;
  }

  const index = await blizzardDataRequest<RealmIndex>(
    "/data/wow/realm/index",
    accessToken,
    "dynamic-eu",
    [locale],
  );
  const realms = index.realms ?? [];
  realmIndexCache.set(locale, realms);

  return realms;
}

export async function resolveRealmSlug(
  accessToken: string,
  realmName: string,
) {
  const cacheKey = normalizeRealmLookup(realmName);
  const cached = realmSlugCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  for (const locale of LOCALES) {
    const realms = await fetchRealmIndex(accessToken, locale);
    const match = realms.find((realm) => {
      if (!realm.name || !realm.slug) {
        return false;
      }

      return (
        normalizeRealmLookup(realm.name) === cacheKey ||
        normalizeRealmLookup(realm.slug) === cacheKey
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
): Promise<PublicCharacterSummary> {
  const url = `${ARMORY_BASE}/${realmSlug}/${encodeURIComponent(characterName)}`;
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
      `"averageItemLevel":\\d+,"class":\\{[^}]+\\},"name":"${escapedName}","race":\\{[^}]+\\},"realm":\\{"name":"[^"]+","slug":"${escapedRealmSlug}"\\},"region":"eu","spec":\\{"enum":"[^"]+","id":\\d+,"name":"([^"]+)"`,
      "u",
    ),
  );

  return {
    itemLevel: itemLevelMatch ? Number(itemLevelMatch[1]) : null,
    activeSpec: specMatch?.[1] ?? null,
  };
}
