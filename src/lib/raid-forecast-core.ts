import type { BlizzardCharacterRaidEncounters } from "@/lib/blizzard-api";
import { getEuWeeklyResetStart } from "@/lib/raid-check-core";

export const FORECAST_TIME_ZONE = "Europe/Moscow";
export const FORECAST_REALM = "howling-fjord";
export const FORECAST_TARGETS = {
  heroic: { label: "Героик", difficultyType: "HEROIC", raidId: 1320, bossId: 2888 },
  mythic: { label: "Мифик", difficultyType: "MYTHIC", raidId: 1320, bossId: 2888 },
} as const;
const RAID_START_MINUTES = 10 * 60;
const CHANCE_DECAY_START_MINUTES = 17 * 60;
const RAID_END_MINUTES = 20 * 60;
export const FORECAST_CHARACTERS = [
  "Зомбак", "Зомбаксмерти", "Зомбакк", "Зомбакен", "Зомбакзверь",
  "Зомбактьмы", "Зомбакор", "Зомбакдх", "Зомбовоин", "Зомбакнзот",
] as const;

export type RaidForecastDifficulty = keyof typeof FORECAST_TARGETS;
export type RaidForecastStatus = "clean" | "locked" | "unknown";
export type RaidForecastCharacter = {
  name: string;
  status: RaidForecastStatus;
  classId: number | null;
  level: number | null;
  lastKillAt: string | null;
};
export type RaidForecastSnapshot = {
  serverNow: string;
  checkedAt: string;
  resetStart: string;
  charactersByDifficulty: Record<RaidForecastDifficulty, RaidForecastCharacter[]>;
};
export type RaidForecast = {
  chance: number | null;
  reason: "outside_hours" | "all_locked" | "available" | "evening" | "unknown";
  freeCount: number;
  lockedCount: number;
  unknownCount: number;
};

const moscowClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: FORECAST_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function getMoscowMinutes(now: Date) {
  const parts = moscowClock.formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return value("hour") * 60 + value("minute") + value("second") / 60;
}

export function createUnknownForecastCharacters(): RaidForecastCharacter[] {
  return FORECAST_CHARACTERS.map((name) => ({
    name, status: "unknown", classId: null, level: null, lastKillAt: null,
  }));
}

export function getRaidForecastLockout(
  encounters: BlizzardCharacterRaidEncounters,
  difficulty: RaidForecastDifficulty,
  now: Date,
): Pick<RaidForecastCharacter, "status" | "lastKillAt"> {
  if (!encounters || typeof encounters !== "object" ||
      (encounters.expansions !== undefined && !Array.isArray(encounters.expansions))) {
    throw new Error("Invalid raid encounter response");
  }

  const target = FORECAST_TARGETS[difficulty];
  let latestKill = 0;
  for (const expansion of encounters.expansions ?? []) {
    for (const instance of expansion.instances ?? []) {
      if (instance.instance?.id !== target.raidId) continue;
      for (const mode of instance.modes ?? []) {
        if (mode.difficulty?.type !== target.difficultyType) continue;
        for (const boss of mode.progress?.encounters ?? mode.encounters ?? []) {
          if (boss.encounter?.id !== target.bossId) continue;
          const timestamp = boss.last_kill_timestamp ?? 0;
          if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp > now.getTime() ||
              (!timestamp && (boss.completed_count ?? 0) > 0)) {
            throw new Error("Invalid boss kill timestamp");
          }
          latestKill = Math.max(latestKill, timestamp);
        }
      }
    }
  }

  return {
    status: latestKill >= getEuWeeklyResetStart(now).getTime() ? "locked" : "clean",
    lastKillAt: latestKill ? new Date(latestKill).toISOString() : null,
  };
}

export function isForecastWeekCurrent(snapshot: RaidForecastSnapshot, now: Date) {
  return snapshot.resetStart === getEuWeeklyResetStart(now).toISOString();
}

export function calculateRaidForecast(
  characters: Pick<RaidForecastCharacter, "status">[],
  now: Date,
): RaidForecast {
  const counts = {
    freeCount: characters.filter((character) => character.status === "clean").length,
    lockedCount: characters.filter((character) => character.status === "locked").length,
    unknownCount: characters.filter((character) => character.status === "unknown").length,
  };
  const minutes = getMoscowMinutes(now);
  if (minutes < RAID_START_MINUTES || minutes >= RAID_END_MINUTES) {
    return { ...counts, chance: 1, reason: "outside_hours" };
  }
  if (counts.freeCount === 0) {
    return counts.unknownCount > 0 || characters.length === 0
      ? { ...counts, chance: null, reason: "unknown" }
      : { ...counts, chance: 1, reason: "all_locked" };
  }
  if (minutes < CHANCE_DECAY_START_MINUTES) {
    return { ...counts, chance: 90, reason: "available" };
  }
  const eveningProgress = (minutes - CHANCE_DECAY_START_MINUTES) / (RAID_END_MINUTES - CHANCE_DECAY_START_MINUTES);
  return { ...counts, chance: Math.max(1, Math.round(90 - 89 * eveningProgress)), reason: "evening" };
}
