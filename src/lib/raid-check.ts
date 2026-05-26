import {
  AddonExportParseError,
  parseAddonExportString,
  type AddonRosterMember,
} from "@/lib/addon-export";
import {
  BattleNetAuthError,
  BlizzardApiRequestError,
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
  type RaidCheckDifficulty,
  type RaidCheckKilledBoss,
} from "@/lib/raid-check-core";
import {
  DEFAULT_RAID_CHECK_LOCALE,
  type RaidCheckLocale,
} from "@/lib/raid-boss-localization";
import { getRaidByName, getRaidBySlug, type RaidDefinition } from "@/lib/raids";

const RAID_CHECK_CONCURRENCY = 5;

export type RaidCheckCharacterStatus =
  | "clean"
  | "locked"
  | "not_found"
  | "error";

export type RaidCheckCharacterResult = {
  name: string;
  realm: string;
  classFile: string;
  role: string;
  status: RaidCheckCharacterStatus;
  killedBosses: RaidCheckKilledBoss[];
  error: string | null;
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

function errorResult(message: string): RaidCheckResult {
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
    const key = `${member.name.toLowerCase()}-${member.realm.toLowerCase()}`;
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

async function checkCharacter({
  accessToken,
  member,
  raid,
  difficulty,
  resetStart,
  locale,
}: {
  accessToken: string;
  member: AddonRosterMember;
  raid: RaidDefinition;
  difficulty: RaidCheckDifficulty;
  resetStart: Date;
  locale: RaidCheckLocale;
}): Promise<RaidCheckCharacterResult> {
  try {
    const realmSlug = await resolveRealmSlug(accessToken, member.realm);

    if (!realmSlug) {
      return {
        ...member,
        status: "not_found",
        killedBosses: [],
        error: "Реалм не найден.",
      };
    }

    const encounters = await fetchCharacterRaidEncounters(
      accessToken,
      realmSlug,
      member.name,
    );
    const killedBosses = getKilledBossesForRaidDifficulty({
      encounters,
      raid,
      difficulty,
      resetStart,
      locale,
    });

    return {
      ...member,
      status: killedBosses.length > 0 ? "locked" : "clean",
      killedBosses,
      error: null,
    };
  } catch (error) {
    if (error instanceof BlizzardApiRequestError && error.status === 404) {
      return {
        ...member,
        status: "not_found",
        killedBosses: [],
        error: "Персонаж не найден.",
      };
    }

    return {
      ...member,
      status: "error",
      killedBosses: [],
      error:
        error instanceof Error
          ? error.message
          : "Не удалось проверить персонажа.",
    };
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
    exportData = parseAddonExportString(exportText);
  } catch (error) {
    return errorResult(
      error instanceof AddonExportParseError
        ? error.message
        : "Не удалось прочитать строку экспорта.",
    );
  }

  const defaultDifficultyID = getDefaultRaidCheckDifficultyID(exportData);
  const difficultyOptions = getRaidCheckDifficultyOptions(exportData);
  const selectedRaid = raidSlug ? getRaidBySlug(raidSlug) : null;

  if (raidSlug && !selectedRaid) {
    return {
      ...errorResult("Выбранный рейд не найден в актуальном каталоге."),
      difficultyOptions,
      defaultDifficultyID,
    };
  }

  if (!selectedRaid && (exportData.groupType !== "raid" || !exportData.instanceName)) {
    return {
      ...errorResult("Выберите актуальный рейд или вставьте строку /rr, сделанную в рейде."),
      difficultyOptions,
      defaultDifficultyID,
    };
  }

  const raid = selectedRaid ?? getRaidByName(exportData.instanceName);
  if (!raid) {
    return {
      ...errorResult("Текущий рейд из строки аддона не найден в каталоге."),
      difficultyOptions,
      defaultDifficultyID,
      raidName: exportData.instanceName,
    };
  }

  const roster = getRoster(exportData).slice(0, 40);
  const usedFallbackRoster = exportData.roster.length === 0;
  const warnings = [
    ...(exportData.groupType !== "raid"
      ? [
          "Строка сделана не в рейде. Проверяем выбранный рейд вручную по найденному составу или экспортирующему персонажу.",
        ]
      : []),
    ...(selectedRaid && exportData.instanceName && getRaidByName(exportData.instanceName)?.slug !== selectedRaid.slug
      ? [
          `Рейд выбран вручную: ${selectedRaid.name}. Инстанс из строки: ${exportData.instanceName}.`,
        ]
      : []),
    ...(usedFallbackRoster
      ? [
          "В строке нет полного состава рейда. Проверьте, что аддон обновлен; сейчас проверен только экспортирующий персонаж.",
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
    const accessToken = await getApplicationAccessToken();
    const rows = await mapWithConcurrency(
      roster,
      RAID_CHECK_CONCURRENCY,
      (member) =>
        checkCharacter({
          accessToken,
          member,
          raid,
          difficulty,
          resetStart,
          locale,
        }),
    );

    return {
      status: "success",
      message: null,
      raidName: raid.name,
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
        error instanceof BattleNetAuthError
          ? "Battle.net отклонил серверный OAuth-запрос. Проверьте client id/secret."
          : error instanceof Error
            ? error.message
            : "Не удалось выполнить проверку.",
      ),
      raidName: raid.name,
      difficulty,
      difficultyOptions,
      defaultDifficultyID,
      resetStart: resetStart.toISOString(),
      usedFallbackRoster,
      warnings,
    };
  }
}
