import { Prisma, type WowCharacter } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isRaiderIoCacheFresh,
  normalizeRaiderIoProfile,
  type RaiderIoCharacterDetailsResult,
  type RaiderIoProfileSummary,
} from "@/lib/raiderio-core";
import {
  normalizeWowCharacterKey,
  type WowCharacterKey,
} from "@/lib/warcraftlogs-api";
import { trimEnvSecret } from "@/lib/warcraftlogs-core";

const RAIDERIO_CHARACTER_PROFILE_URL = "https://raider.io/api/v1/characters/profile";
const RAIDERIO_PROFILE_FIELDS =
  "mythic_plus_scores_by_season:current,mythic_plus_ranks,mythic_plus_best_runs,mythic_plus_recent_runs,raid_progression,gear";

type RaiderIoLookupOptions = {
  forceRefresh?: boolean;
};

export class RaiderIoNotFoundError extends Error {}
export class RaiderIoRateLimitError extends Error {}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function getRaiderIoAccessKey() {
  return trimEnvSecret(process.env.RAIDERIO_ACCESS_KEY);
}

export function getRaiderIoProfileUrl(key: WowCharacterKey) {
  const normalizedKey = normalizeWowCharacterKey(key);

  return `https://raider.io/characters/${encodeURIComponent(
    normalizedKey.serverRegion,
  )}/${encodeURIComponent(normalizedKey.serverSlug)}/${encodeURIComponent(
    normalizedKey.name,
  )}`;
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

function getRaiderIoProfileFromRecord(record: WowCharacter) {
  const value = record.raiderIoProfileJson;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  if (!("score" in value) && !("profileUrl" in value) && !("bestRuns" in value)) {
    return null;
  }

  return value as RaiderIoProfileSummary;
}

function recordToRaiderIoDetails(
  record: WowCharacter,
  message: string | null = null,
): RaiderIoCharacterDetailsResult {
  const profile = getRaiderIoProfileFromRecord(record);
  const profileUrl =
    record.raiderIoProfileUrl ?? profile?.profileUrl ?? getRaiderIoProfileUrl(record);

  return {
    status: profile || record.raiderIoScore !== null ? "ready" : "not_found",
    message,
    profile,
    profileUrl,
    score: record.raiderIoScore ?? profile?.score ?? null,
    lastFetchedAt: record.raiderIoFetchedAt?.toISOString() ?? null,
  };
}

function emptyRaiderIoDetails({
  message,
  profileUrl,
  status,
}: {
  message: string | null;
  profileUrl: string | null;
  status: RaiderIoCharacterDetailsResult["status"];
}): RaiderIoCharacterDetailsResult {
  return {
    status,
    message,
    profile: null,
    profileUrl,
    score: null,
    lastFetchedAt: null,
  };
}

export async function fetchRaiderIoCharacterProfile(key: WowCharacterKey) {
  const normalizedKey = normalizeWowCharacterKey(key);
  const url = new URL(RAIDERIO_CHARACTER_PROFILE_URL);
  const accessKey = getRaiderIoAccessKey();

  url.searchParams.set("region", normalizedKey.serverRegion);
  url.searchParams.set("realm", normalizedKey.serverSlug);
  url.searchParams.set("name", normalizedKey.name);
  url.searchParams.set("fields", RAIDERIO_PROFILE_FIELDS);

  if (accessKey) {
    url.searchParams.set("access_key", accessKey);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new RaiderIoNotFoundError("Raider.IO profile was not found.");
  }

  if (response.status === 429) {
    throw new RaiderIoRateLimitError("Raider.IO rate limit was reached.");
  }

  if (!response.ok) {
    throw new Error((await response.text()) || response.statusText);
  }

  return response.json();
}

export async function refreshRaiderIoCharacterProfile(key: WowCharacterKey) {
  const normalizedKey = normalizeWowCharacterKey(key);
  await upsertEmptyWowCharacter(normalizedKey);
  const fetchedAt = new Date();

  try {
    const payload = await fetchRaiderIoCharacterProfile(normalizedKey);
    const profile = normalizeRaiderIoProfile(payload);

    return prisma.wowCharacter.update({
      where: {
        name_serverSlug_serverRegion: normalizedKey,
      },
      data: {
        raiderIoProfileJson: toJsonValue(profile),
        raiderIoScore: profile.score,
        raiderIoProfileUrl: profile.profileUrl ?? getRaiderIoProfileUrl(normalizedKey),
        raiderIoFetchedAt: fetchedAt,
      },
    });
  } catch (error) {
    if (error instanceof RaiderIoNotFoundError) {
      return prisma.wowCharacter.update({
        where: {
          name_serverSlug_serverRegion: normalizedKey,
        },
        data: {
          raiderIoProfileJson: Prisma.JsonNull,
          raiderIoScore: null,
          raiderIoProfileUrl: getRaiderIoProfileUrl(normalizedKey),
          raiderIoFetchedAt: fetchedAt,
        },
      });
    }

    throw error;
  }
}

export async function getRaiderIoCharacterDetails(
  key: WowCharacterKey,
  options: RaiderIoLookupOptions = {},
): Promise<RaiderIoCharacterDetailsResult> {
  const normalizedKey = normalizeWowCharacterKey(key);
  const profileUrl = getRaiderIoProfileUrl(normalizedKey);

  if (!normalizedKey.name || !normalizedKey.serverSlug || !normalizedKey.serverRegion) {
    return emptyRaiderIoDetails({
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

  if (
    !options.forceRefresh &&
    existing &&
    isRaiderIoCacheFresh(existing.raiderIoFetchedAt)
  ) {
    return recordToRaiderIoDetails(existing);
  }

  try {
    const refreshed = await refreshRaiderIoCharacterProfile(normalizedKey);
    return recordToRaiderIoDetails(refreshed);
  } catch (error) {
    if (existing?.raiderIoFetchedAt) {
      return recordToRaiderIoDetails(
        existing,
        error instanceof Error ? error.message : "Raider.IO refresh failed.",
      );
    }

    return emptyRaiderIoDetails({
      status: "error",
      message: error instanceof Error ? error.message : "Raider.IO refresh failed.",
      profileUrl,
    });
  }
}

export type { RaiderIoCharacterDetailsResult };
