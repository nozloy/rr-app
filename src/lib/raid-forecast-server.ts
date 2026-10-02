// Imported only by the server action; the browser uses raid-forecast-core.
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

const CACHE_MS = 60_000;
const REQUEST_TIMEOUT_MS = 12_000;
type CachedForecast = Omit<RaidForecastSnapshot, "serverNow">;
let cached: { value: CachedForecast; expiresAt: number } | null = null;
let inFlight: { resetStart: string; promise: Promise<CachedForecast> } | null = null;

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

export async function getRaidForecast(): Promise<RaidForecastSnapshot> {
  const now = new Date();
  const resetStart = getEuWeeklyResetStart(now).toISOString();
  if (cached && cached.value.resetStart === resetStart && cached.expiresAt > now.getTime()) {
    return { ...cached.value, serverNow: now.toISOString() };
  }
  if (inFlight?.resetStart === resetStart) {
    const value = await inFlight.promise;
    return { ...value, serverNow: new Date().toISOString() };
  }

  const promise = fetchForecast(resetStart);
  inFlight = { resetStart, promise };
  try {
    const value = await promise;
    if (getEuWeeklyResetStart(new Date()).toISOString() === resetStart) {
      cached = { value, expiresAt: Date.now() + CACHE_MS };
    }
    return { ...value, serverNow: new Date().toISOString() };
  } finally {
    if (inFlight?.promise === promise) inFlight = null;
  }
}
