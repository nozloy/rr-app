import { Prisma, type WowCharacter } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RaidCheckCharacterResult } from "@/lib/raid-check";
import {
  buildWarcraftLogsRaidStats,
  getWarcraftLogsSummary,
  isWarcraftLogsCacheFresh,
  normalizeWarcraftLogsGear,
  trimEnvSecret,
  type WarcraftLogsCharacterDetailsResult,
  type WarcraftLogsGearSummary,
  type WarcraftLogsRaidStats,
} from "@/lib/warcraftlogs-core";

const WARCRAFTLOGS_OAUTH_URL = "https://www.warcraftlogs.com/oauth/token";
const WARCRAFTLOGS_GRAPHQL_URL = "https://www.warcraftlogs.com/api/v2/client";
const WARCRAFTLOGS_SYNC_CONCURRENCY = 3;

type WarcraftLogsTokenCache = {
  accessToken: string;
  expiresAt: number;
};

type WarcraftLogsTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type WarcraftLogsGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

type WarcraftLogsZone = {
  id: number;
  name: string;
  frozen: boolean;
  difficulties?: Array<{
    id?: number;
    name?: string;
  }>;
};

type WarcraftLogsCharacterPayload = {
  characterData: {
    character: {
      id: number;
      name: string;
      heroicRankings: unknown;
      mythicRankings: unknown;
      gameData: unknown;
    } | null;
  };
};

type WarcraftLogsZonesPayload = {
  worldData: {
    zones: WarcraftLogsZone[];
  };
};

type WowCharacterKey = {
  name: string;
  serverSlug: string;
  serverRegion: string;
};

let tokenCache: WarcraftLogsTokenCache | null = null;
let currentRaidZoneCache: WarcraftLogsZone | null = null;

function getWarcraftLogsEnv() {
  const clientId = trimEnvSecret(process.env.WARCRAFTLOGS_CLIENT_ID);
  const clientSecret = trimEnvSecret(process.env.WARCRAFTLOGS_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    throw new Error("Missing Warcraft Logs API credentials.");
  }

  return { clientId, clientSecret };
}

function normalizeWowCharacterKey({
  name,
  serverSlug,
  serverRegion,
}: WowCharacterKey): WowCharacterKey {
  return {
    name: name.trim(),
    serverSlug: serverSlug.trim().toLowerCase(),
    serverRegion: serverRegion.trim().toLowerCase(),
  };
}

export function getWowCharacterCacheKey(key: WowCharacterKey) {
  const normalizedKey = normalizeWowCharacterKey(key);

  return `${normalizedKey.name.toLowerCase()}-${normalizedKey.serverSlug}-${normalizedKey.serverRegion}`;
}

export function getWarcraftLogsProfileUrl({
  name,
  serverSlug,
  serverRegion,
}: WowCharacterKey) {
  const key = normalizeWowCharacterKey({ name, serverSlug, serverRegion });

  return `https://www.warcraftlogs.com/character/${encodeURIComponent(
    key.serverRegion,
  )}/${encodeURIComponent(key.serverSlug)}/${encodeURIComponent(key.name)}`;
}

async function getWarcraftLogsAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret } = getWarcraftLogsEnv();
  const response = await fetch(WARCRAFTLOGS_OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString(
        "base64",
      )}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error((await response.text()) || response.statusText);
  }

  const token = (await response.json()) as WarcraftLogsTokenResponse;

  if (!token.access_token) {
    throw new Error("Warcraft Logs token response did not include access_token.");
  }

  tokenCache = {
    accessToken: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  };

  return token.access_token;
}

async function warcraftLogsGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
) {
  const accessToken = await getWarcraftLogsAccessToken();
  const response = await fetch(WARCRAFTLOGS_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error((await response.text()) || response.statusText);
  }

  const payload = (await response.json()) as WarcraftLogsGraphqlResponse<T>;

  if (payload.errors?.length) {
    throw new Error(
      payload.errors.map((error) => error.message ?? "GraphQL error").join("; "),
    );
  }

  if (!payload.data) {
    throw new Error("Warcraft Logs GraphQL response did not include data.");
  }

  return payload.data;
}

export async function fetchCurrentWarcraftLogsRaidZone() {
  if (currentRaidZoneCache) {
    return currentRaidZoneCache;
  }

  const data = await warcraftLogsGraphql<WarcraftLogsZonesPayload>(`
    query CurrentRaidZone {
      worldData {
        zones {
          id
          name
          frozen
          difficulties {
            id
            name
          }
        }
      }
    }
  `);
  const zone = data.worldData.zones
    .filter((item) => {
      const difficultyIds = new Set(
        item.difficulties?.map((difficulty) => difficulty.id) ?? [],
      );

      return !item.frozen && difficultyIds.has(4) && difficultyIds.has(5);
    })
    .sort((left, right) => right.id - left.id)[0];

  if (!zone) {
    throw new Error("Warcraft Logs current raid zone was not found.");
  }

  currentRaidZoneCache = zone;
  return zone;
}

async function fetchWarcraftLogsCharacterPayload(key: WowCharacterKey) {
  const normalizedKey = normalizeWowCharacterKey(key);
  const zone = await fetchCurrentWarcraftLogsRaidZone();

  const data = await warcraftLogsGraphql<WarcraftLogsCharacterPayload>(
    `
      query CharacterRankings(
        $name: String!
        $serverSlug: String!
        $serverRegion: String!
        $zoneID: Int!
      ) {
        characterData {
          character(
            name: $name
            serverSlug: $serverSlug
            serverRegion: $serverRegion
          ) {
            id
            name
            heroicRankings: zoneRankings(zoneID: $zoneID, difficulty: 4)
            mythicRankings: zoneRankings(zoneID: $zoneID, difficulty: 5)
            gameData
          }
        }
      }
    `,
    {
      name: normalizedKey.name,
      serverSlug: normalizedKey.serverSlug,
      serverRegion: normalizedKey.serverRegion,
      zoneID: zone.id,
    },
  );

  return {
    character: data.characterData.character,
    zone,
  };
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function getRaidStatsFromRecord(record: WowCharacter) {
  return record.raidStatsJson as WarcraftLogsRaidStats | null;
}

function getGearFromRecord(record: WowCharacter) {
  return record.gearJson as WarcraftLogsGearSummary | null;
}

function emptyDetails({
  message,
  profileUrl,
  status,
}: {
  message: string | null;
  profileUrl: string | null;
  status: WarcraftLogsCharacterDetailsResult["status"];
}): WarcraftLogsCharacterDetailsResult {
  return {
    status,
    message,
    profileUrl,
    lastFetchedAt: null,
    warcraftLogsId: null,
    summary: {
      averageParse: null,
      bestParse: null,
    },
    rankings: {
      heroic: null,
      mythic: null,
    },
    gear: null,
  };
}

function recordToDetails(
  record: WowCharacter,
  message: string | null = null,
): WarcraftLogsCharacterDetailsResult {
  const raidStats = getRaidStatsFromRecord(record);
  const gear = getGearFromRecord(record);
  const status =
    record.warcraftLogsId || raidStats || gear ? "ready" : "not_found";

  return {
    status,
    message,
    profileUrl: getWarcraftLogsProfileUrl(record),
    lastFetchedAt: record.lastFetchedAt?.toISOString() ?? null,
    warcraftLogsId: record.warcraftLogsId,
    summary: {
      averageParse: record.averageParse,
      bestParse: record.bestParse,
    },
    rankings: {
      heroic: raidStats?.heroic ?? null,
      mythic: raidStats?.mythic ?? null,
    },
    gear,
  };
}

async function upsertEmptyWowCharacter(key: WowCharacterKey) {
  const normalizedKey = normalizeWowCharacterKey(key);

  return prisma.wowCharacter.upsert({
    where: {
      name_serverSlug_serverRegion: normalizedKey,
    },
    create: normalizedKey,
    update: {},
  });
}

export async function refreshWowCharacterRankings(key: WowCharacterKey) {
  const normalizedKey = normalizeWowCharacterKey(key);
  await upsertEmptyWowCharacter(normalizedKey);

  const { character, zone } = await fetchWarcraftLogsCharacterPayload(normalizedKey);
  const fetchedAt = new Date();

  if (!character) {
    return prisma.wowCharacter.update({
      where: {
        name_serverSlug_serverRegion: normalizedKey,
      },
      data: {
        warcraftLogsId: null,
        lastFetchedAt: fetchedAt,
        rankingsJson: Prisma.JsonNull,
        gearJson: Prisma.JsonNull,
        averageParse: null,
        bestParse: null,
        raidStatsJson: Prisma.JsonNull,
      },
    });
  }

  const raidStats = buildWarcraftLogsRaidStats({
    heroicPayload: character.heroicRankings,
    mythicPayload: character.mythicRankings,
    zoneId: zone.id,
    zoneName: zone.name,
  });
  const summary = getWarcraftLogsSummary(raidStats);
  const gear = normalizeWarcraftLogsGear(character.gameData);

  return prisma.wowCharacter.update({
    where: {
      name_serverSlug_serverRegion: normalizedKey,
    },
    data: {
      warcraftLogsId: character.id,
      lastFetchedAt: fetchedAt,
      rankingsJson: toJsonValue({
        zoneId: zone.id,
        zoneName: zone.name,
        heroic: character.heroicRankings,
        mythic: character.mythicRankings,
      }),
      gearJson: gear ? toJsonValue(gear) : Prisma.JsonNull,
      averageParse: summary.averageParse,
      bestParse: summary.bestParse,
      raidStatsJson: toJsonValue(raidStats),
    },
  });
}

export async function getWarcraftLogsCharacterDetails(
  key: WowCharacterKey,
): Promise<WarcraftLogsCharacterDetailsResult> {
  const normalizedKey = normalizeWowCharacterKey(key);
  const profileUrl = getWarcraftLogsProfileUrl(normalizedKey);

  if (!normalizedKey.name || !normalizedKey.serverSlug || !normalizedKey.serverRegion) {
    return emptyDetails({
      status: "error",
      message: "Missing character name, server slug, or region.",
      profileUrl: null,
    });
  }

  const existing = await prisma.wowCharacter.findUnique({
    where: {
      name_serverSlug_serverRegion: normalizedKey,
    },
  });

  if (existing && isWarcraftLogsCacheFresh(existing.lastFetchedAt)) {
    return recordToDetails(existing);
  }

  try {
    const refreshed = await refreshWowCharacterRankings(normalizedKey);
    return recordToDetails(refreshed);
  } catch (error) {
    if (existing?.lastFetchedAt) {
      return recordToDetails(
        existing,
        error instanceof Error ? error.message : "Warcraft Logs refresh failed.",
      );
    }

    return emptyDetails({
      status: "error",
      message:
        error instanceof Error ? error.message : "Warcraft Logs refresh failed.",
      profileUrl,
    });
  }
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<void>,
) {
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
}

export async function syncWowCharactersFromRaidCheckRows(
  rows: RaidCheckCharacterResult[],
): Promise<Map<string, WarcraftLogsCharacterDetailsResult>> {
  const seen = new Set<string>();
  const detailsByKey = new Map<string, WarcraftLogsCharacterDetailsResult>();
  const candidates = rows.flatMap((row) => {
    if (!row.serverSlug) {
      return [];
    }

    const key = normalizeWowCharacterKey({
      name: row.name,
      serverSlug: row.serverSlug,
      serverRegion: row.serverRegion,
    });
    const seenKey = getWowCharacterCacheKey(key);

    if (seen.has(seenKey)) {
      return [];
    }

    seen.add(seenKey);
    return [key];
  });

  await mapWithConcurrency(candidates, WARCRAFTLOGS_SYNC_CONCURRENCY, async (key) => {
    const cacheKey = getWowCharacterCacheKey(key);

    try {
      detailsByKey.set(cacheKey, await getWarcraftLogsCharacterDetails(key));
    } catch (error) {
      await upsertEmptyWowCharacter(key).catch(() => undefined);
      detailsByKey.set(
        cacheKey,
        emptyDetails({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Warcraft Logs refresh failed.",
          profileUrl: getWarcraftLogsProfileUrl(key),
        }),
      );
    }
  });

  return detailsByKey;
}

export type { WarcraftLogsCharacterDetailsResult };
