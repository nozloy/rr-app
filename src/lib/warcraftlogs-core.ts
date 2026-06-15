export const WARCRAFTLOGS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type WarcraftLogsDifficulty = "heroic" | "mythic";

export type WarcraftLogsEncounterParse = {
  name: string;
  parse: number | null;
  bestAmount: number | null;
  totalKills: number | null;
  rank: number | null;
  spec: string | null;
};

export type WarcraftLogsDifficultySummary = {
  difficulty: WarcraftLogsDifficulty;
  label: string;
  zoneId: number;
  zoneName: string;
  averageParse: number | null;
  bestParse: number | null;
  encounters: WarcraftLogsEncounterParse[];
};

export type WarcraftLogsRaidStats = {
  zoneId: number;
  zoneName: string;
  heroic: WarcraftLogsDifficultySummary | null;
  mythic: WarcraftLogsDifficultySummary | null;
};

export type WarcraftLogsGearItem = {
  id: number | null;
  name: string;
  slot: string | null;
  itemLevel: number | null;
  quality: string | number | null;
  icon: string | null;
};

export type WarcraftLogsGearSummary = {
  itemLevel: number | null;
  items: WarcraftLogsGearItem[];
};

export type WarcraftLogsCharacterDetailsResult = {
  status: "ready" | "not_found" | "error";
  message: string | null;
  profileUrl: string | null;
  lastFetchedAt: string | null;
  warcraftLogsId: number | null;
  summary: {
    averageParse: number | null;
    bestParse: number | null;
  };
  rankings: {
    heroic: WarcraftLogsDifficultySummary | null;
    mythic: WarcraftLogsDifficultySummary | null;
  };
  gear: WarcraftLogsGearSummary | null;
};

export function trimEnvSecret(value: string | undefined) {
  return value?.trim().replace(/^["']|["']$/g, "") ?? "";
}

export function isWarcraftLogsCacheFresh(
  lastFetchedAt: Date | string | null | undefined,
  now = new Date(),
) {
  if (!lastFetchedAt) {
    return false;
  }

  const fetchedAt =
    lastFetchedAt instanceof Date ? lastFetchedAt : new Date(lastFetchedAt);

  if (Number.isNaN(fetchedAt.getTime())) {
    return false;
  }

  return now.getTime() - fetchedAt.getTime() < WARCRAFTLOGS_CACHE_TTL_MS;
}

function roundParse(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNestedRecord(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  return asRecord(source[key]);
}

function getFirstNumber(
  source: Record<string, unknown>,
  keys: readonly string[],
) {
  for (const key of keys) {
    const value = getNumber(source[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getParseValue(source: Record<string, unknown>) {
  return getFirstNumber(source, [
    "rankPercent",
    "percentile",
    "parse",
    "bestPercent",
    "historicalPercent",
    "todayPercent",
  ]);
}

function getEncounterName(source: Record<string, unknown>) {
  const encounter = getNestedRecord(source, "encounter");
  return (
    getString(encounter?.name) ??
    getString(source.encounterName) ??
    getString(source.name) ??
    null
  );
}

function getSpecName(source: Record<string, unknown>) {
  const spec = getNestedRecord(source, "spec");
  return getString(spec?.name) ?? getString(source.specName) ?? null;
}

function getRankingEntries(payload: unknown) {
  const root = asRecord(payload);
  const rankings = root?.rankings;

  if (Array.isArray(rankings)) {
    return rankings
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  const entries: Record<string, unknown>[] = [];

  function walk(value: unknown) {
    if (entries.length >= 80) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    const record = asRecord(value);

    if (!record) {
      return;
    }

    if (getEncounterName(record) && getParseValue(record) !== null) {
      entries.push(record);
      return;
    }

    Object.values(record).forEach(walk);
  }

  walk(payload);

  return entries;
}

function getTopLevelAverage(payload: unknown) {
  const root = asRecord(payload);

  if (!root) {
    return null;
  }

  return getFirstNumber(root, [
    "bestPerformanceAverage",
    "medianPerformanceAverage",
    "averagePerformance",
    "averageParse",
  ]);
}

export function summarizeWarcraftLogsZoneRankings({
  difficulty,
  label,
  payload,
  zoneId,
  zoneName,
}: {
  difficulty: WarcraftLogsDifficulty;
  label: string;
  payload: unknown;
  zoneId: number;
  zoneName: string;
}): WarcraftLogsDifficultySummary | null {
  if (!payload) {
    return null;
  }

  const encounters = getRankingEntries(payload)
    .map((entry) => {
      const name = getEncounterName(entry);

      if (!name) {
        return null;
      }

      return {
        name,
        parse: roundParse(getParseValue(entry)),
        bestAmount: getFirstNumber(entry, ["bestAmount", "amount", "total"]),
        totalKills: getFirstNumber(entry, ["totalKills", "kills"]),
        rank: getFirstNumber(entry, ["rank", "historicalRank"]),
        spec: getSpecName(entry),
      } satisfies WarcraftLogsEncounterParse;
    })
    .filter(
      (entry): entry is WarcraftLogsEncounterParse => entry !== null,
    );
  const parseValues = encounters
    .map((encounter) => encounter.parse)
    .filter((value): value is number => value !== null);
  const averageFromEncounters =
    parseValues.length > 0
      ? parseValues.reduce((sum, value) => sum + value, 0) / parseValues.length
      : null;
  const averageParse = roundParse(getTopLevelAverage(payload) ?? averageFromEncounters);
  const bestParse =
    parseValues.length > 0 ? roundParse(Math.max(...parseValues)) : averageParse;

  return {
    difficulty,
    label,
    zoneId,
    zoneName,
    averageParse,
    bestParse,
    encounters,
  };
}

export function buildWarcraftLogsRaidStats({
  heroicPayload,
  mythicPayload,
  zoneId,
  zoneName,
}: {
  heroicPayload: unknown;
  mythicPayload: unknown;
  zoneId: number;
  zoneName: string;
}): WarcraftLogsRaidStats {
  return {
    zoneId,
    zoneName,
    heroic: summarizeWarcraftLogsZoneRankings({
      difficulty: "heroic",
      label: "Heroic",
      payload: heroicPayload,
      zoneId,
      zoneName,
    }),
    mythic: summarizeWarcraftLogsZoneRankings({
      difficulty: "mythic",
      label: "Mythic",
      payload: mythicPayload,
      zoneId,
      zoneName,
    }),
  };
}

export function getWarcraftLogsSummary(
  stats: Pick<WarcraftLogsRaidStats, "heroic" | "mythic">,
) {
  const averages = [stats.heroic?.averageParse, stats.mythic?.averageParse]
    .filter((value): value is number => value !== null && value !== undefined);
  const bestValues = [stats.heroic?.bestParse, stats.mythic?.bestParse]
    .filter((value): value is number => value !== null && value !== undefined);

  return {
    averageParse:
      averages.length > 0
        ? roundParse(averages.reduce((sum, value) => sum + value, 0) / averages.length)
        : null,
    bestParse: bestValues.length > 0 ? roundParse(Math.max(...bestValues)) : null,
  };
}

function findFirstNumberDeep(value: unknown, keys: readonly string[]): number | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstNumberDeep(item, keys);

      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const direct = getFirstNumber(record, keys);
  if (direct !== null) {
    return direct;
  }

  for (const nested of Object.values(record)) {
    const found = findFirstNumberDeep(nested, keys);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function getGearCandidates(gameData: unknown) {
  const root = asRecord(gameData);

  if (!root) {
    return [];
  }

  const candidates = [root.gear, root.items, root.equipment];
  const nestedCharacter = getNestedRecord(root, "character");

  if (nestedCharacter) {
    candidates.push(
      nestedCharacter.gear,
      nestedCharacter.items,
      nestedCharacter.equipment,
    );
  }

  return candidates.find(Array.isArray) ?? [];
}

export function normalizeWarcraftLogsGear(
  gameData: unknown,
): WarcraftLogsGearSummary | null {
  if (!gameData) {
    return null;
  }

  const itemLevel = findFirstNumberDeep(gameData, [
    "itemLevel",
    "averageItemLevel",
    "equippedItemLevel",
    "ilvl",
  ]);
  const items = getGearCandidates(gameData)
    .map((item) => {
      const record = asRecord(item);

      if (!record) {
        return null;
      }

      const nestedItem = getNestedRecord(record, "item");
      const slot = getNestedRecord(record, "slot");
      const name =
        getString(record.name) ??
        getString(nestedItem?.name) ??
        getString(record.itemName);

      if (!name) {
        return null;
      }

      return {
        id: getFirstNumber(record, ["id", "itemID", "itemId"]) ?? getNumber(nestedItem?.id),
        name,
        slot:
          getString(slot?.name) ??
          getString(record.slotName) ??
          getString(record.slot) ??
          null,
        itemLevel: getFirstNumber(record, [
          "itemLevel",
          "ilvl",
          "level",
          "effectiveItemLevel",
        ]),
        quality:
          getString(record.quality) ??
          getString(nestedItem?.quality) ??
          getNumber(record.quality) ??
          null,
        icon:
          getString(record.icon) ??
          getString(nestedItem?.icon) ??
          getString(record.iconUrl) ??
          null,
      } satisfies WarcraftLogsGearItem;
    })
    .filter((item): item is WarcraftLogsGearItem => item !== null);

  return {
    itemLevel: itemLevel ? Math.round(itemLevel) : null,
    items,
  };
}
