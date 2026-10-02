import type { BlizzardCharacterRaidEncounters } from "@/lib/blizzard-api";
import { getEuWeeklyResetStart } from "@/lib/raid-check-core";

export const FORECAST_TIME_ZONE = "Europe/Moscow";
export const FORECAST_REALM = "howling-fjord";
export const FORECAST_RAID_ID = 1317;
export const FORECAST_BOSS_ID = 2849;
export const FORECAST_CHARACTERS = [
  "Зомбак", "Зомбаксмерти", "Зомбакк", "Зомбакен", "Зомбакзверь",
  "Зомбактьмы", "Зомбакор", "Зомбакдх", "Зомбовоин", "Зомбакнзот",
] as const;

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
  characters: RaidForecastCharacter[];
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

export function getHeroicNymrissaLockout(
  encounters: BlizzardCharacterRaidEncounters,
  now: Date,
): Pick<RaidForecastCharacter, "status" | "lastKillAt"> {
  if (!encounters || typeof encounters !== "object" ||
      (encounters.expansions !== undefined && !Array.isArray(encounters.expansions))) {
    throw new Error("Invalid raid encounter response");
  }

  let latestKill = 0;
  for (const expansion of encounters.expansions ?? []) {
    for (const instance of expansion.instances ?? []) {
      if (instance.instance?.id !== FORECAST_RAID_ID) continue;
      for (const mode of instance.modes ?? []) {
        if (mode.difficulty?.type !== "HEROIC") continue;
        for (const boss of mode.progress?.encounters ?? mode.encounters ?? []) {
          if (boss.encounter?.id !== FORECAST_BOSS_ID) continue;
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
  if (minutes < 600 || minutes >= 1140) {
    return { ...counts, chance: 1, reason: "outside_hours" };
  }
  if (counts.freeCount === 0) {
    return counts.unknownCount > 0 || characters.length === 0
      ? { ...counts, chance: null, reason: "unknown" }
      : { ...counts, chance: 1, reason: "all_locked" };
  }
  return minutes < 1020
    ? { ...counts, chance: 90, reason: "available" }
    : { ...counts, chance: Math.max(1, Math.round(90 - 89 * (minutes - 1020) / 120)), reason: "evening" };
}
