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
  getHeroicNymrissaLockout,
  type RaidForecastCharacter,
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
const globalForForecast = globalThis as typeof globalThis & { raidForecastCache?: ForecastCache };
// Share the cooldown and pending request across server module reloads too.
const cache = globalForForecast.raidForecastCache ??= { value: null, expiresAt: 0, inFlight: null };

function toCurrentSnapshot(value: CachedForecast, now = new Date()): RaidForecastSnapshot {
  const reset = getEuWeeklyResetStart(now);
  const resetStart = reset.toISOString();
  // A weekly reset clears old lockouts without bypassing the shared API cooldown.
  const characters = value.resetStart === resetStart ? value.characters : value.characters.map((character) => (
    character.status === "unknown" ? character : {
      ...character,
      status: character.lastKillAt && Date.parse(character.lastKillAt) >= reset.getTime()
        ? "locked" as const : "clean" as const,
    }
  ));
  return { ...value, characters, resetStart, serverNow: now.toISOString() };
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
  if (encounters.status === "fulfilled") {
    try {
      Object.assign(result, getHeroicNymrissaLockout(encounters.value, new Date()));
    } catch {
      // Malformed or unavailable data must never count as a free character.
    }
  }
  return result;
}

async function fetchForecast(resetStart: string): Promise<CachedForecast> {
  const characters = createUnknownForecastCharacters();
  try {
    const accessToken = await getApplicationAccessToken("eu", AbortSignal.timeout(REQUEST_TIMEOUT_MS));
    let next = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < characters.length) {
        const index = next++;
        characters[index] = await checkCharacter(characters[index], accessToken);
      }
    }));
  } catch {
    // Keep the fixed roster visible even when credentials or Blizzard are unavailable.
  }
  return { characters, resetStart, checkedAt: new Date().toISOString() };
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
const readCachedForecast = unstable_cache(fetchSharedForecast, ["kogda-raid-forecast-v2"], {
  revalidate: CACHE_MS / 1_000,
});

export async function getRaidForecast(): Promise<RaidForecastSnapshot> {
  return toCurrentSnapshot(await readCachedForecast());
}
