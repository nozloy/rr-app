import type { AddonExportData } from "@/lib/addon-export";
import type {
  BlizzardCharacterRaidEncounters,
  BlizzardRaidEncounterMode,
} from "@/lib/blizzard-api";
import {
  DEFAULT_RAID_CHECK_LOCALE,
  localizeRaidBossName,
  type RaidCheckLocale,
} from "@/lib/raid-boss-localization";
import type { RaidDefinition } from "@/lib/raids";

const EU_WEEKLY_RESET_DAY = 3;
const EU_WEEKLY_RESET_HOUR_UTC = 4;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const ALL_SEASON_RAIDS_VALUE = "all-season-raids";

export type RaidCheckDifficulty = {
  id: number;
  label: string;
  type: string | null;
};

export type RaidCheckKilledBoss = {
  id: number | null;
  name: string;
  raidName?: string;
  raidSlug?: string;
  sourceName: string;
  lastKillTimestamp: number;
};

export const RAID_CHECK_DIFFICULTIES: RaidCheckDifficulty[] = [
  { id: 17, label: "LFR", type: "LFR" },
  { id: 14, label: "Normal", type: "NORMAL" },
  { id: 15, label: "Heroic", type: "HEROIC" },
  { id: 16, label: "Mythic", type: "MYTHIC" },
];

export function normalizeRaidCheckText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/giu, "");
}

export function getRaidCheckDifficultyById(
  difficultyID: number,
  fallbackName?: string | null,
): RaidCheckDifficulty {
  const known = RAID_CHECK_DIFFICULTIES.find(
    (difficulty) => difficulty.id === difficultyID,
  );

  return (
    known ?? {
      id: difficultyID,
      label: fallbackName ?? `Difficulty ${difficultyID}`,
      type: null,
    }
  );
}

export function getDefaultRaidCheckDifficultyID(exportData: AddonExportData) {
  return exportData.selectedRaidDifficultyID ?? exportData.difficultyID ?? 15;
}

export function getRaidCheckDifficultyOptions(exportData: AddonExportData) {
  const options = [...RAID_CHECK_DIFFICULTIES];
  const importedDifficultyID = getDefaultRaidCheckDifficultyID(exportData);

  if (!options.some((difficulty) => difficulty.id === importedDifficultyID)) {
    options.push(
      getRaidCheckDifficultyById(
        importedDifficultyID,
        exportData.selectedRaidDifficultyName ?? exportData.difficultyName,
      ),
    );
  }

  return options;
}

export function getEuWeeklyResetStart(now = new Date()) {
  const nowMs = now.getTime();
  const candidate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      EU_WEEKLY_RESET_HOUR_UTC,
      0,
      0,
      0,
    ),
  );
  const daysSinceReset =
    (candidate.getUTCDay() - EU_WEEKLY_RESET_DAY + 7) % 7;
  candidate.setUTCDate(candidate.getUTCDate() - daysSinceReset);

  if (candidate.getTime() > nowMs) {
    candidate.setTime(candidate.getTime() - WEEK_MS);
  }

  return candidate;
}

function getRaidNames(raid: RaidDefinition) {
  return [raid.name, raid.shortName, raid.slug, ...raid.aliases].map(
    normalizeRaidCheckText,
  );
}

function modeMatchesDifficulty(
  mode: BlizzardRaidEncounterMode,
  difficulty: RaidCheckDifficulty,
) {
  const difficultyType = mode.difficulty?.type?.toUpperCase();
  const difficultyName = mode.difficulty?.name
    ? normalizeRaidCheckText(mode.difficulty.name)
    : "";

  return (
    Boolean(difficulty.type && difficultyType === difficulty.type) ||
    Boolean(difficulty.label && difficultyName === normalizeRaidCheckText(difficulty.label))
  );
}

export function getKilledBossesForRaidDifficulty({
  encounters,
  raid,
  difficulty,
  resetStart,
  locale = DEFAULT_RAID_CHECK_LOCALE,
}: {
  encounters: BlizzardCharacterRaidEncounters;
  raid: RaidDefinition;
  difficulty: RaidCheckDifficulty;
  resetStart: Date;
  locale?: RaidCheckLocale;
}) {
  const raidNames = getRaidNames(raid);
  const resetStartMs = resetStart.getTime();

  for (const expansion of encounters.expansions ?? []) {
    for (const instance of expansion.instances ?? []) {
      const instanceName = instance.instance?.name
        ? normalizeRaidCheckText(instance.instance.name)
        : "";

      if (!instanceName || !raidNames.includes(instanceName)) {
        continue;
      }

      const mode = (instance.modes ?? []).find((candidate) =>
        modeMatchesDifficulty(candidate, difficulty),
      );

      if (!mode) {
        return [];
      }

      const modeEncounters = mode.progress?.encounters ?? mode.encounters ?? [];
      return modeEncounters
        .filter((encounter) => {
          const timestamp = encounter.last_kill_timestamp ?? 0;
          return timestamp >= resetStartMs;
        })
        .map((encounter) => {
          const id = encounter.encounter?.id ?? null;
          const sourceName = encounter.encounter?.name ?? "Unknown boss";

          return {
            id,
            name: localizeRaidBossName({ id, name: sourceName }, locale),
            sourceName,
            lastKillTimestamp: encounter.last_kill_timestamp ?? 0,
          };
        });
    }
  }

  return [];
}
