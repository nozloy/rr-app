"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import {
  checkRaidLockoutsForExport,
  type RaidCheckInput,
  type RaidCheckCharacterLogs,
  type RaidCheckCharacterResult,
  type RaidCheckLogDifficulty,
  type RaidCheckResult,
} from "@/lib/raid-check";
import { ALL_SEASON_RAIDS_VALUE } from "@/lib/raid-check-core";
import {
  getBlizzardArmoryUrl,
  type BlizzardRegion,
} from "@/lib/blizzard-api";
import {
  getBlizzardEquipmentDetails,
  type BlizzardEquipmentDetailsResult,
} from "@/lib/blizzard-equipment-api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getRaiderIoCharacterDetails,
  getRaiderIoProfileUrl,
  type RaiderIoCharacterDetailsResult,
} from "@/lib/raiderio-api";
import {
  getWarcraftLogsCharacterDetails,
  getWarcraftLogsProfileUrl,
  getWowCharacterCacheKey,
  normalizeWowCharacterKey,
  syncWowCharactersFromRaidCheckRows,
  type WarcraftLogsCharacterDetailsResult,
} from "@/lib/warcraftlogs-api";

function getSelectedLogsDifficulty(
  difficulty: RaidCheckResult["difficulty"],
): RaidCheckLogDifficulty | null {
  const value = `${difficulty?.type ?? ""} ${difficulty?.label ?? ""}`.toLowerCase();

  if (value.includes("mythic")) {
    return "mythic";
  }

  if (value.includes("heroic")) {
    return "heroic";
  }

  return null;
}

function getWarcraftLogsRaidSlug(result: RaidCheckResult) {
  const raidSlug = result.rows[0]?.raidSlug;

  return raidSlug && raidSlug !== ALL_SEASON_RAIDS_VALUE ? raidSlug : null;
}

function emptyCharacterLogs({
  difficulty,
  lastFetchedAt = null,
  message,
  profileUrl = null,
  status,
}: {
  difficulty: RaidCheckLogDifficulty | null;
  lastFetchedAt?: string | null;
  message: string | null;
  profileUrl?: string | null;
  status: RaidCheckCharacterLogs["status"];
}): RaidCheckCharacterLogs {
  return {
    status,
    difficulty,
    averageParse: null,
    bestParse: null,
    encounters: [],
    profileUrl,
    lastFetchedAt,
    message,
  };
}

function detailsToCharacterLogs(
  details: WarcraftLogsCharacterDetailsResult | undefined,
  difficulty: RaidCheckLogDifficulty | null,
): RaidCheckCharacterLogs {
  if (!difficulty) {
    return emptyCharacterLogs({
      difficulty,
      status: "unsupported",
      message: null,
    });
  }

  if (!details) {
    return emptyCharacterLogs({
      difficulty,
      status: "error",
      message: "Warcraft Logs data is not available.",
    });
  }

  if (details.status === "error") {
    return emptyCharacterLogs({
      difficulty,
      lastFetchedAt: details.lastFetchedAt,
      message: details.message,
      profileUrl: details.profileUrl,
      status: "error",
    });
  }

  if (details.status === "not_found") {
    return emptyCharacterLogs({
      difficulty,
      lastFetchedAt: details.lastFetchedAt,
      message: details.message,
      profileUrl: details.profileUrl,
      status: "not_found",
    });
  }

  const summary = details.rankings[difficulty];

  if (!summary) {
    return emptyCharacterLogs({
      difficulty,
      lastFetchedAt: details.lastFetchedAt,
      message: null,
      profileUrl: details.profileUrl,
      status: "not_found",
    });
  }

  return {
    status: "ready",
    difficulty,
    averageParse: summary.averageParse,
    bestParse: summary.bestParse,
    encounters: summary.encounters.map((encounter) => ({
      name: encounter.name,
      parse: encounter.parse,
      spec: encounter.spec,
      totalKills: encounter.totalKills,
      rank: encounter.rank,
    })),
    profileUrl: details.profileUrl,
    lastFetchedAt: details.lastFetchedAt,
    message: details.message,
  };
}

function attachWarcraftLogsToRows({
  detailsByKey,
  difficulty,
  rows,
}: {
  detailsByKey: Map<string, WarcraftLogsCharacterDetailsResult>;
  difficulty: RaidCheckLogDifficulty | null;
  rows: RaidCheckCharacterResult[];
}) {
  return rows.map((row) => {
    if (!row.serverSlug) {
      return {
        ...row,
        logs: emptyCharacterLogs({
          difficulty,
          status: "error",
          message: "Missing server slug for Warcraft Logs lookup.",
        }),
      };
    }

    const details = detailsByKey.get(
      getWowCharacterCacheKey({
        name: row.name,
        serverSlug: row.serverSlug,
        serverRegion: row.serverRegion,
      }),
    );

    return {
      ...row,
      logs: detailsToCharacterLogs(details, difficulty),
    };
  });
}

export async function raidCheckAction(
  input: RaidCheckInput,
): Promise<RaidCheckResult> {
  const result = await checkRaidLockoutsForExport(input);

  if (result.status === "success") {
    const difficulty = getSelectedLogsDifficulty(result.difficulty);
    const raidSlug = getWarcraftLogsRaidSlug(result);
    const detailsByKey = await syncWowCharactersFromRaidCheckRows(result.rows, {
      raidSlug,
    }).catch(() => new Map<string, WarcraftLogsCharacterDetailsResult>());

    return {
      ...result,
      rows: attachWarcraftLogsToRows({
        detailsByKey,
        difficulty,
        rows: result.rows,
      }),
    };
  }

  return result;
}

export type RaidCheckCharacterDetailsInput = {
  forceRefresh?: boolean;
  name: string;
  realm?: string | null;
  raidSlug?: string | null;
  serverSlug: string | null;
  serverRegion: string;
};

export type RaidCheckBookmarkState = {
  isBookmarked: boolean;
  requiresAuth: boolean;
};

export type RaidCheckBookmarkActionResult =
  | {
      status: "success";
      bookmark: RaidCheckBookmarkState;
    }
  | {
      status: "requires_auth";
      bookmark: RaidCheckBookmarkState;
    }
  | {
      status: "error";
      bookmark: RaidCheckBookmarkState;
      message: string;
    };

export type RaidCheckCharacterSheetDetails = {
  warcraftLogs: WarcraftLogsCharacterDetailsResult;
  raiderIo: RaiderIoCharacterDetailsResult;
  equipment: BlizzardEquipmentDetailsResult;
  bookmark: RaidCheckBookmarkState;
  links: {
    armory: string | null;
    raiderIo: string | null;
    warcraftLogs: string | null;
  };
  lastUpdatedAt: string | null;
  warnings: string[];
};

function normalizeRegion(value: string): BlizzardRegion | null {
  const normalized = value.trim().toLowerCase();

  return normalized === "eu" || normalized === "us" ? normalized : null;
}

function maxDate(values: Array<string | null>) {
  const timestamps = values
    .map((value) => (value ? new Date(value).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function emptyWarcraftLogsDetails(
  message: string,
): WarcraftLogsCharacterDetailsResult {
  return {
    status: "error",
    message,
    profileUrl: null,
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

function emptyRaiderIoDetails(message: string): RaiderIoCharacterDetailsResult {
  return {
    status: "error",
    message,
    profile: null,
    profileUrl: null,
    score: null,
    lastFetchedAt: null,
  };
}

function emptyEquipmentDetails(message: string): BlizzardEquipmentDetailsResult {
  return {
    status: "error",
    message,
    lastFetchedAt: null,
    itemLevel: null,
    topItem: null,
    items: [],
  };
}

async function getBookmarkState({
  name,
  serverRegion,
  serverSlug,
}: {
  name: string;
  serverSlug: string;
  serverRegion: string;
}): Promise<RaidCheckBookmarkState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      isBookmarked: false,
      requiresAuth: true,
    };
  }

  const bookmark = await prisma.raidCheckBookmark.findUnique({
    where: {
      userId_name_serverSlug_serverRegion: {
        userId: session.user.id,
        name,
        serverSlug,
        serverRegion,
      },
    },
  });

  return {
    isBookmarked: Boolean(bookmark),
    requiresAuth: false,
  };
}

function getSourceWarnings(
  ...sources: Array<{ message: string | null; status: string }>
) {
  return sources
    .filter((source) => source.message && source.status !== "not_found")
    .map((source) => source.message as string);
}

export async function getRaidCheckCharacterDetailsAction({
  forceRefresh = false,
  name,
  raidSlug,
  serverSlug,
  serverRegion,
}: RaidCheckCharacterDetailsInput): Promise<RaidCheckCharacterSheetDetails> {
  if (!serverSlug) {
    const message = "Missing server slug for character lookup.";

    return {
      warcraftLogs: emptyWarcraftLogsDetails(message),
      raiderIo: emptyRaiderIoDetails(message),
      equipment: emptyEquipmentDetails(message),
      bookmark: {
        isBookmarked: false,
        requiresAuth: true,
      },
      links: {
        armory: null,
        raiderIo: null,
        warcraftLogs: null,
      },
      lastUpdatedAt: null,
      warnings: [message],
    };
  }

  const key = normalizeWowCharacterKey({
    name,
    serverSlug,
    serverRegion,
  });
  const region = normalizeRegion(key.serverRegion);
  const [warcraftLogs, raiderIo, equipment, bookmark] = await Promise.all([
    getWarcraftLogsCharacterDetails(key, {
      forceRefresh,
      raidSlug: raidSlug === ALL_SEASON_RAIDS_VALUE ? null : raidSlug,
    }),
    getRaiderIoCharacterDetails(key, { forceRefresh }),
    getBlizzardEquipmentDetails(key, { forceRefresh }),
    getBookmarkState(key),
  ]);
  const links = {
    armory: region
      ? getBlizzardArmoryUrl(key.serverSlug, key.name, region)
      : null,
    raiderIo: raiderIo.profileUrl ?? getRaiderIoProfileUrl(key),
    warcraftLogs: warcraftLogs.profileUrl ?? getWarcraftLogsProfileUrl(key),
  };

  return {
    warcraftLogs,
    raiderIo,
    equipment,
    bookmark,
    links,
    lastUpdatedAt: maxDate([
      warcraftLogs.lastFetchedAt,
      raiderIo.lastFetchedAt,
      equipment.lastFetchedAt,
    ]),
    warnings: getSourceWarnings(warcraftLogs, raiderIo, equipment),
  };
}

export async function toggleRaidCheckBookmarkAction({
  name,
  realm,
  serverSlug,
  serverRegion,
}: RaidCheckCharacterDetailsInput): Promise<RaidCheckBookmarkActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      status: "requires_auth",
      bookmark: {
        isBookmarked: false,
        requiresAuth: true,
      },
    };
  }

  if (!serverSlug) {
    return {
      status: "error",
      message: "Missing server slug for character lookup.",
      bookmark: {
        isBookmarked: false,
        requiresAuth: false,
      },
    };
  }

  const key = normalizeWowCharacterKey({
    name,
    serverSlug,
    serverRegion,
  });
  const where = {
    userId_name_serverSlug_serverRegion: {
      userId: session.user.id,
      name: key.name,
      serverSlug: key.serverSlug,
      serverRegion: key.serverRegion,
    },
  };

  try {
    const existing = await prisma.raidCheckBookmark.findUnique({ where });

    if (existing) {
      await prisma.raidCheckBookmark.delete({ where });

      return {
        status: "success",
        bookmark: {
          isBookmarked: false,
          requiresAuth: false,
        },
      };
    }

    await prisma.raidCheckBookmark.create({
      data: {
        userId: session.user.id,
        name: key.name,
        realm: realm ?? null,
        serverSlug: key.serverSlug,
        serverRegion: key.serverRegion,
      },
    });

    return {
      status: "success",
      bookmark: {
        isBookmarked: true,
        requiresAuth: false,
      },
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        status: "success",
        bookmark: {
          isBookmarked: true,
          requiresAuth: false,
        },
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Bookmark update failed.",
      bookmark: {
        isBookmarked: false,
        requiresAuth: false,
      },
    };
  }
}
