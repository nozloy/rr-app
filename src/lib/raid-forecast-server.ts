// Imported only by the server action; the browser uses raid-forecast-core.
import { unstable_cache } from "next/cache";
import {
  fetchCharacterProfile,
  fetchCharacterRaidEncounters,
  getApplicationAccessToken,
} from "@/lib/blizzard-api";
import { getEuWeeklyResetStart } from "@/lib/raid-check-core";
import {
  createUnknownForecastCharacters,
  FORECAST_REALM,
  getRaidForecastLockout,
  type RaidForecastCharacter,
  type RaidForecastDifficulty,
  type RaidForecastSnapshot,
} from "@/lib/raid-forecast-core";

const CACHE_MS = 10 * 60_000;
const REQUEST_TIMEOUT_MS = 12_000;
type CachedForecast = Omit<RaidForecastSnapshot, "serverNow">;
type ForecastCache = {
  value: CachedForecast | null;
  expiresAt: number;
  inFlight: Promise<CachedForecast> | null;
};
const globalForForecast = globalThis as typeof globalThis & { raidForecastCacheV3?: ForecastCache };
// Share the cooldown and pending request across server module reloads too.
const cache = globalForForecast.raidForecastCacheV3 ??= { value: null, expiresAt: 0, inFlight: null };

function toCurrentSnapshot(value: CachedForecast, now = new Date()): RaidForecastSnapshot {
  const reset = getEuWeeklyResetStart(now);
  const resetStart = reset.toISOString();
  // A weekly reset clears old lockouts without bypassing the shared API cooldown.
  const clearPreviousWeek = (characters: RaidForecastCharacter[]) => characters.map((character) => (
    character.status === "unknown" ? character : {
      ...character,
      status: character.lastKillAt && Date.parse(character.lastKillAt) >= reset.getTime()
        ? "locked" as const : "clean" as const,
    }
  ));
  const charactersByDifficulty = value.resetStart === resetStart ? value.charactersByDifficulty : {
    heroic: clearPreviousWeek(value.charactersByDifficulty.heroic),
    mythic: clearPreviousWeek(value.charactersByDifficulty.mythic),
  };
  return { ...value, charactersByDifficulty, resetStart, serverNow: now.toISOString() };
}

async function checkCharacter(
  character: RaidForecastCharacter,
  accessToken: string,
) {
  const [encounters, profile] = await Promise.allSettled([
    fetchCharacterRaidEncounters(accessToken, FORECAST_REALM, character.name, "eu", AbortSignal.timeout(REQUEST_TIMEOUT_MS)),
    fetchCharacterProfile(accessToken, FORECAST_REALM, character.name, "eu", AbortSignal.timeout(REQUEST_TIMEOUT_MS)),
  ]);
  const result = { ...character };
  if (profile.status === "fulfilled") {
    result.classId = profile.value?.character_class?.id ?? profile.value?.playable_class?.id ?? null;
    result.level = profile.value?.level ?? null;
  }
  const now = new Date();
  const forDifficulty = (difficulty: RaidForecastDifficulty): RaidForecastCharacter => {
    if (encounters.status === "fulfilled") {
      try {
        return { ...result, ...getRaidForecastLockout(encounters.value, difficulty, now) };
      } catch {
        // Invalid data for one difficulty must not hide the other difficulty's result.
      }
    }
    return { ...result };
  };
  return { heroic: forDifficulty("heroic"), mythic: forDifficulty("mythic") };
}

async function fetchForecast(resetStart: string): Promise<CachedForecast> {
  const charactersByDifficulty = {
    heroic: createUnknownForecastCharacters(),
    mythic: createUnknownForecastCharacters(),
  };
  try {
    const accessToken = await getApplicationAccessToken("eu", AbortSignal.timeout(REQUEST_TIMEOUT_MS));
    let next = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < charactersByDifficulty.heroic.length) {
        const index = next++;
        const result = await checkCharacter(charactersByDifficulty.heroic[index], accessToken);
        charactersByDifficulty.heroic[index] = result.heroic;
        charactersByDifficulty.mythic[index] = result.mythic;
      }
    }));
  } catch {
    // Keep the fixed roster visible even when credentials or Blizzard are unavailable.
  }
  return { charactersByDifficulty, resetStart, checkedAt: new Date().toISOString() };
}

async function fetchSharedForecast(): Promise<CachedForecast> {
  const now = new Date();
  const resetStart = getEuWeeklyResetStart(now).toISOString();
  if (cache.value && cache.expiresAt > now.getTime()) {
    return cache.value;
  }
  if (cache.inFlight) {
    return cache.inFlight;
  }

  const promise = fetchForecast(resetStart);
  cache.inFlight = promise;
  try {
    const value = await promise;
    cache.value = value;
    cache.expiresAt = Date.now() + CACHE_MS;
    return value;
  } finally {
    if (cache.inFlight === promise) cache.inFlight = null;
  }
}

// Next's shared Data Cache stores the snapshot; server time is always calculated live.
// Keep the key stable across weekly resets so they cannot bypass the API cooldown.
const readCachedForecast = unstable_cache(fetchSharedForecast, ["kogda-raid-forecast-v3"], {
  revalidate: CACHE_MS / 1_000,
});

export async function getRaidForecast(): Promise<RaidForecastSnapshot> {
  return toCurrentSnapshot(await readCachedForecast());
}
