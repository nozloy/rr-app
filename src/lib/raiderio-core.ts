export const RAIDERIO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type RaiderIoRankScope = {
  world: number | null;
  region: number | null;
  realm: number | null;
};

export type RaiderIoMythicPlusRun = {
  dungeon: string;
  shortName: string | null;
  mythicLevel: number | null;
  completedAt: string | null;
  score: number | null;
  upgrades: number | null;
  url: string | null;
};

export type RaiderIoRaidProgression = {
  slug: string;
  summary: string | null;
  totalBosses: number | null;
  normalKills: number | null;
  heroicKills: number | null;
  mythicKills: number | null;
};

export type RaiderIoProfileSummary = {
  name: string | null;
  className: string | null;
  activeSpecName: string | null;
  activeSpecRole: string | null;
  thumbnailUrl: string | null;
  profileUrl: string | null;
  lastCrawledAt: string | null;
  score: number | null;
  scoreColor: string | null;
  overallRank: RaiderIoRankScope | null;
  classRank: RaiderIoRankScope | null;
  bestRuns: RaiderIoMythicPlusRun[];
  recentRuns: RaiderIoMythicPlusRun[];
  raidProgression: RaiderIoRaidProgression[];
};

export type RaiderIoCharacterDetailsResult = {
  status: "ready" | "not_found" | "error";
  message: string | null;
  profile: RaiderIoProfileSummary | null;
  profileUrl: string | null;
  score: number | null;
  lastFetchedAt: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getNestedRecord(
  source: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  return source ? asRecord(source[key]) : null;
}

function roundScore(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function normalizeRankScope(value: unknown): RaiderIoRankScope | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    world: getNumber(record.world),
    region: getNumber(record.region),
    realm: getNumber(record.realm),
  };
}

function normalizeRun(value: unknown): RaiderIoMythicPlusRun | null {
  const record = asRecord(value);
  const dungeon = getString(record?.dungeon);

  if (!record || !dungeon) {
    return null;
  }

  return {
    dungeon,
    shortName: getString(record.short_name),
    mythicLevel: getNumber(record.mythic_level),
    completedAt: getString(record.completed_at),
    score: roundScore(getNumber(record.score)),
    upgrades: getNumber(record.num_keystone_upgrades),
    url: getString(record.url),
  };
}

function normalizeRuns(value: unknown) {
  return Array.isArray(value)
    ? value
        .map(normalizeRun)
        .filter((item): item is RaiderIoMythicPlusRun => item !== null)
    : [];
}

function normalizeRaidProgression(value: unknown) {
  const record = asRecord(value);

  if (!record) {
    return [];
  }

  return Object.entries(record)
    .map(([slug, rawProgression]) => {
      const progression = asRecord(rawProgression);

      if (!progression) {
        return null;
      }

      return {
        slug,
        summary: getString(progression.summary),
        totalBosses: getNumber(progression.total_bosses),
        normalKills: getNumber(progression.normal_bosses_killed),
        heroicKills: getNumber(progression.heroic_bosses_killed),
        mythicKills: getNumber(progression.mythic_bosses_killed),
      } satisfies RaiderIoRaidProgression;
    })
    .filter((item): item is RaiderIoRaidProgression => item !== null);
}

function getCurrentSeason(value: unknown) {
  return Array.isArray(value) ? asRecord(value[0]) : null;
}

export function normalizeRaiderIoProfile(payload: unknown): RaiderIoProfileSummary {
  const root = asRecord(payload) ?? {};
  const currentSeason = getCurrentSeason(root.mythic_plus_scores_by_season);
  const scores = getNestedRecord(currentSeason, "scores");
  const segments = getNestedRecord(currentSeason, "segments");
  const allSegment = getNestedRecord(segments, "all");
  const ranks = asRecord(root.mythic_plus_ranks);

  return {
    name: getString(root.name),
    className: getString(root.class),
    activeSpecName: getString(root.active_spec_name),
    activeSpecRole: getString(root.active_spec_role),
    thumbnailUrl: getString(root.thumbnail_url),
    profileUrl: getString(root.profile_url),
    lastCrawledAt: getString(root.last_crawled_at),
    score: roundScore(getNumber(scores?.all) ?? getNumber(allSegment?.score)),
    scoreColor: getString(allSegment?.color),
    overallRank: normalizeRankScope(ranks?.overall),
    classRank: normalizeRankScope(ranks?.class),
    bestRuns: normalizeRuns(root.mythic_plus_best_runs),
    recentRuns: normalizeRuns(root.mythic_plus_recent_runs),
    raidProgression: normalizeRaidProgression(root.raid_progression),
  };
}

export function isRaiderIoCacheFresh(
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

  return now.getTime() - fetchedAt.getTime() < RAIDERIO_CACHE_TTL_MS;
}
