"use server";

import {
  checkRaidLockoutsForExport,
  type RaidCheckInput,
  type RaidCheckCharacterLogs,
  type RaidCheckCharacterResult,
  type RaidCheckLogDifficulty,
  type RaidCheckResult,
} from "@/lib/raid-check";
import {
  getWarcraftLogsCharacterDetails,
  getWowCharacterCacheKey,
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
    const detailsByKey = await syncWowCharactersFromRaidCheckRows(result.rows).catch(
      () => new Map<string, WarcraftLogsCharacterDetailsResult>(),
    );

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
  name: string;
  serverSlug: string | null;
  serverRegion: string;
};

export async function getRaidCheckCharacterDetailsAction({
  name,
  serverSlug,
  serverRegion,
}: RaidCheckCharacterDetailsInput): Promise<WarcraftLogsCharacterDetailsResult> {
  if (!serverSlug) {
    return {
      status: "error",
      message: "Missing server slug for Warcraft Logs lookup.",
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

  return getWarcraftLogsCharacterDetails({
    name,
    serverSlug,
    serverRegion,
  });
}
