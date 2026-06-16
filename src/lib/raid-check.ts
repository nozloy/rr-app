import {
  AddonExportParseError,
  parseAddonExportString,
  type AddonRosterMember,
} from "@/lib/addon-export";
import {
  BattleNetAuthError,
  BlizzardApiRequestError,
  fetchCharacterMedia,
  fetchCharacterRaidEncounters,
  getApplicationAccessToken,
  resolveRealmSlug,
} from "@/lib/blizzard-api";
import {
  getDefaultRaidCheckDifficultyID,
  getEuWeeklyResetStart,
  getKilledBossesForRaidDifficulty,
  getRaidCheckDifficultyById,
  getRaidCheckDifficultyOptions,
  ALL_SEASON_RAIDS_VALUE,
  type RaidCheckDifficulty,
  type RaidCheckKilledBoss,
} from "@/lib/raid-check-core";
import {
  DEFAULT_RAID_CHECK_LOCALE,
  type RaidCheckLocale,
} from "@/lib/raid-boss-localization";
import { t } from "@/lib/i18n";
import {
  currentRaidInstances,
  getLocalizedRaidName,
  getRaidByName,
  getRaidBySlug,
  type RaidDefinition,
} from "@/lib/raids";

const RAID_CHECK_CONCURRENCY = 5;

export type RaidCheckCharacterStatus =
  | "clean"
  | "locked"
  | "not_found"
  | "error";

export type RaidCheckLogDifficulty = "heroic" | "mythic";

export type RaidCheckLogEncounter = {
  name: string;
  parse: number | null;
  spec: string | null;
  totalKills: number | null;
  rank: number | null;
};

export type RaidCheckCharacterLogs = {
  status: "ready" | "not_found" | "unsupported" | "error";
  difficulty: RaidCheckLogDifficulty | null;
  averageParse: number | null;
  bestParse: number | null;
  encounters: RaidCheckLogEncounter[];
  profileUrl: string | null;
  lastFetchedAt: string | null;
  message: string | null;
};

export type RaidCheckCharacterResult = {
  name: string;
  realm: string;
  classFile: string;
  role: string;
  raidName: string;
  raidSlug: string;
  status: RaidCheckCharacterStatus;
  killedBosses: RaidCheckKilledBoss[];
  error: string | null;
  avatarUrl: string | null;
  serverSlug: string | null;
  serverRegion: string;
  logs: RaidCheckCharacterLogs | null;
};

export type RaidCheckResult = {
  status: "success" | "error";
  message: string | null;
  raidName: string | null;
  difficulty: RaidCheckDifficulty | null;
  difficultyOptions: RaidCheckDifficulty[];
  defaultDifficultyID: number;
  resetStart: string | null;
  usedFallbackRoster: boolean;
  warnings: string[];
  rows: RaidCheckCharacterResult[];
};

export type RaidCheckInput = {
  exportText: string;
  difficultyID?: number | null;
  locale?: RaidCheckLocale;
  raidSlug?: string | null;
};

function tr(locale: RaidCheckLocale, key: string, params?: Record<string, string | number>) {
  return t(locale, key, params);
}

function errorResult(locale: RaidCheckLocale, message: string): RaidCheckResult {
  return {
    status: "error",
    message,
    raidName: null,
    difficulty: null,
    difficultyOptions: [],
    defaultDifficultyID: 15,
    resetStart: null,
    usedFallbackRoster: false,
    warnings: [],
    rows: [],
  };
}

function buildFallbackRoster(exportData: ReturnType<typeof parseAddonExportString>) {
  return [
    {
      name: exportData.playerName,
      realm: exportData.realm,
      realmSlug: exportData.realmSlug,
      serverRegion: exportData.serverRegion,
      classFile: exportData.classFile,
      role: "NONE",
    },
  ] satisfies AddonRosterMember[];
}

function getRoster(exportData: ReturnType<typeof parseAddonExportString>) {
  const source =
    exportData.roster.length > 0 ? exportData.roster : buildFallbackRoster(exportData);
  const seen = new Set<string>();

  return source.filter((member) => {
    const key = `${member.serverRegion}-${member.name.toLowerCase()}-${member.realm.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

function getResultRaidMeta(raids: RaidDefinition[], locale: RaidCheckLocale) {
  if (raids.length === 1) {
    return {
      raidName: getLocalizedRaidName(raids[0], locale),
      raidSlug: raids[0].slug,
    };
  }

  return {
    raidName: tr(locale, "raidcheck.allSeasonRaids"),
    raidSlug: ALL_SEASON_RAIDS_VALUE,
  };
}

function getCharacterAvatarUrl(
  media: Awaited<ReturnType<typeof fetchCharacterMedia>> | null,
) {
  if (!media?.assets) {
    return null;
  }

  for (const key of ["avatar", "inset", "main-raw"]) {
    const asset = media.assets.find((item) => item.key === key);

    if (asset?.value) {
      return asset.value;
    }
  }

  return null;
}

function buildUnavailableResult({
  error = null,
  locale,
  member,
  raids,
  serverSlug = null,
  status,
}: {
  error?: string | null;
  member: AddonRosterMember;
  locale: RaidCheckLocale;
  raids: RaidDefinition[];
  serverSlug?: string | null;
  status?: RaidCheckCharacterStatus;
}): RaidCheckCharacterResult {
  const raidMeta = getResultRaidMeta(raids, locale);

  return {
    ...member,
    ...raidMeta,
    status: status ?? "error",
    killedBosses: [],
    error,
    avatarUrl: null,
    serverSlug,
    serverRegion: member.serverRegion,
    logs: null,
  };
}

async function checkCharacterForRaids({
  accessToken,
  member,
  raids,
  difficulty,
  resetStart,
  locale,
}: {
  accessToken: string;
  member: AddonRosterMember;
  raids: RaidDefinition[];
  difficulty: RaidCheckDifficulty;
  resetStart: Date;
  locale: RaidCheckLocale;
}): Promise<RaidCheckCharacterResult> {
  let realmSlug: string | null = member.realmSlug;

  try {
    realmSlug =
      realmSlug ??
      (await resolveRealmSlug(accessToken, member.realm, member.serverRegion));

    if (!realmSlug) {
      return buildUnavailableResult({
        error: tr(locale, "errors.notFound"),
        member,
        locale,
        raids,
        status: "not_found",
      });
    }

    const avatarUrlPromise = fetchCharacterMedia(
      accessToken,
      realmSlug,
      member.name,
      member.serverRegion,
    )
      .then(getCharacterAvatarUrl)
      .catch(() => null);
    const [encounters, avatarUrl] = await Promise.all([
      fetchCharacterRaidEncounters(
        accessToken,
        realmSlug,
        member.name,
        member.serverRegion,
      ),
      avatarUrlPromise,
    ]);

    const killedBosses = raids.flatMap((raid) =>
      getKilledBossesForRaidDifficulty({
        encounters,
        raid,
        difficulty,
        resetStart,
        locale,
      }).map((boss) => ({
        ...boss,
        raidName: getLocalizedRaidName(raid, locale),
        raidSlug: raid.slug,
      })),
    );
    const raidMeta = getResultRaidMeta(raids, locale);

    return {
      ...member,
      ...raidMeta,
      status: killedBosses.length > 0 ? "locked" : "clean",
      killedBosses,
      error: null,
      avatarUrl,
      serverSlug: realmSlug,
      serverRegion: member.serverRegion,
      logs: null,
    };
  } catch (error) {
    if (error instanceof BlizzardApiRequestError && error.status === 404) {
      return buildUnavailableResult({
        error: tr(locale, "errors.notFound"),
        member,
        locale,
        raids,
        serverSlug: realmSlug,
        status: "not_found",
      });
    }

    return buildUnavailableResult({
      error:
        error instanceof Error
          ? error.message
          : tr(locale, "errors.unknown"),
      member,
      locale,
      raids,
      serverSlug: realmSlug,
      status: "error",
    });
  }
}

export async function checkRaidLockoutsForExport({
  exportText,
  difficultyID,
  locale = DEFAULT_RAID_CHECK_LOCALE,
  raidSlug,
}: RaidCheckInput): Promise<RaidCheckResult> {
  let exportData: ReturnType<typeof parseAddonExportString>;

  try {
    exportData = parseAddonExportString(exportText, locale);
  } catch (error) {
    return errorResult(
      locale,
      error instanceof AddonExportParseError
        ? error.message
        : tr(locale, "raidcheck.previewParseError"),
    );
  }

  const defaultDifficultyID = getDefaultRaidCheckDifficultyID(exportData);
  const difficultyOptions = getRaidCheckDifficultyOptions(exportData);
  const checksAllSeasonRaids = raidSlug === ALL_SEASON_RAIDS_VALUE;
  const selectedRaid =
    raidSlug && !checksAllSeasonRaids ? getRaidBySlug(raidSlug) : null;

  if (raidSlug && !checksAllSeasonRaids && !selectedRaid) {
    return {
      ...errorResult(
        locale,
        locale === "ru"
          ? "Выбранный рейд не найден в актуальном каталоге."
          : "Selected raid was not found in the current catalog.",
      ),
      difficultyOptions,
      defaultDifficultyID,
    };
  }

  if (
    !checksAllSeasonRaids &&
    !selectedRaid &&
    (exportData.groupType !== "raid" || !exportData.instanceName)
  ) {
    return {
      ...errorResult(
        locale,
        locale === "ru"
          ? "Выберите актуальный рейд или вставьте строку /rr, сделанную в рейде."
          : "Choose a current raid or paste /rr export created in a raid.",
      ),
      difficultyOptions,
      defaultDifficultyID,
    };
  }

  const raid = selectedRaid ?? getRaidByName(exportData.instanceName);
  if (!checksAllSeasonRaids && !raid) {
    return {
      ...errorResult(
        locale,
        locale === "ru"
          ? "Текущий рейд из строки аддона не найден в каталоге."
          : "Raid from addon export was not found in the catalog.",
      ),
      difficultyOptions,
      defaultDifficultyID,
      raidName: exportData.instanceName,
    };
  }

  const raids: RaidDefinition[] = checksAllSeasonRaids
    ? currentRaidInstances
    : raid
      ? [raid]
      : [];
  if (raids.length === 0) {
    return {
      ...errorResult(
        locale,
        locale === "ru"
          ? "В каталоге нет рейдов сезона для проверки."
          : "No season raids found in the catalog.",
      ),
      difficultyOptions,
      defaultDifficultyID,
    };
  }

  const roster = getRoster(exportData).slice(0, 40);
  const usedFallbackRoster = exportData.roster.length === 0;
  const warnings = [
    ...(exportData.groupType !== "raid"
      ? checksAllSeasonRaids
        ? [
            locale === "ru"
              ? "Строка сделана не в рейде. Проверяем все рейды сезона по найденному составу или экспортирующему персонажу."
              : "Export was created outside of raid. Checking all season raids using roster or exporter character.",
          ]
        : [
            locale === "ru"
              ? "Строка сделана не в рейде. Проверяем выбранный рейд вручную по найденному составу или экспортирующему персонажу."
              : "Export was created outside of raid. Checking manually selected raid using roster or exporter character.",
          ]
      : []),
    ...(selectedRaid && exportData.instanceName && getRaidByName(exportData.instanceName)?.slug !== selectedRaid.slug
      ? [
          locale === "ru"
            ? `Рейд выбран вручную: ${getLocalizedRaidName(selectedRaid, locale)}. Инстанс из строки: ${exportData.instanceName}.`
            : `Raid selected manually: ${getLocalizedRaidName(selectedRaid, locale)}. Instance from export: ${exportData.instanceName}.`,
        ]
      : []),
    ...(usedFallbackRoster
      ? [
          locale === "ru"
            ? "В строке нет полного состава рейда. Проверьте, что аддон обновлен; сейчас проверен только экспортирующий персонаж."
            : "Full raid roster is missing in export. Ensure addon is updated; only exporter character was checked.",
        ]
      : []),
  ];
  const selectedDifficultyID = difficultyID ?? defaultDifficultyID;
  const difficulty = getRaidCheckDifficultyById(
    selectedDifficultyID,
    exportData.selectedRaidDifficultyName ?? exportData.difficultyName,
  );
  const resetStart = getEuWeeklyResetStart();

  try {
    const accessToken = await getApplicationAccessToken(exportData.serverRegion);
    const rows = await mapWithConcurrency(
      roster,
      RAID_CHECK_CONCURRENCY,
      (member) =>
        checkCharacterForRaids({
          accessToken,
          member,
          raids,
          difficulty,
          resetStart,
          locale,
        }),
    );

    return {
      status: "success",
      message: null,
      raidName: checksAllSeasonRaids
        ? tr(locale, "raidcheck.allSeasonRaids")
        : getLocalizedRaidName(raids[0], locale),
      difficulty,
      difficultyOptions,
      defaultDifficultyID,
      resetStart: resetStart.toISOString(),
      usedFallbackRoster,
      warnings,
      rows,
    };
  } catch (error) {
    return {
      ...errorResult(
        locale,
        error instanceof BattleNetAuthError
          ? tr(locale, "errors.unauthorized")
          : error instanceof Error
            ? error.message
            : tr(locale, "errors.unknown"),
      ),
      raidName: checksAllSeasonRaids
        ? tr(locale, "raidcheck.allSeasonRaids")
        : getLocalizedRaidName(raids[0], locale),
      difficulty,
      difficultyOptions,
      defaultDifficultyID,
      resetStart: resetStart.toISOString(),
      usedFallbackRoster,
      warnings,
    };
  }
}
