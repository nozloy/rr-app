const api = vi.hoisted(() => ({
  getApplicationAccessToken: vi.fn(), fetchCharacterRaidEncounters: vi.fn(), fetchCharacterProfile: vi.fn(),
}));
vi.mock("@/lib/blizzard-api", () => api);
vi.mock("next/cache", () => ({ unstable_cache: (callback: () => Promise<unknown>) => callback }));

function raidHistory(heroicKill: number, mythicKill: number) {
  return { expansions: [{ instances: [
    { instance: { id: 1320 }, modes: [{
      difficulty: { type: "HEROIC" },
      progress: { encounters: [{ encounter: { id: 2888 }, last_kill_timestamp: heroicKill }] },
    }, {
      difficulty: { type: "MYTHIC" },
      progress: { encounters: [{ encounter: { id: 2888 }, last_kill_timestamp: mythicKill }] },
    }] },
  ] }] };
}

async function service() {
  vi.resetModules();
  return import("@/lib/raid-forecast-server");
}

describe("forecast data service", () => {
  beforeEach(() => {
    vi.stubGlobal("raidForecastCacheV4", undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T09:00:00Z"));
    vi.resetAllMocks();
    api.getApplicationAccessToken.mockResolvedValue("application-token");
    api.fetchCharacterRaidEncounters.mockResolvedValue({ expansions: [] });
    api.fetchCharacterProfile.mockResolvedValue({ character_class: { id: 10 }, level: 90 });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps the fixed roster in order and fetches it without a user session", async () => {
    const { getRaidForecast } = await service();
    const result = await getRaidForecast();
    for (const characters of Object.values(result.charactersByDifficulty)) {
      expect(characters).toHaveLength(10);
      expect(characters[0]).toMatchObject({ name: "Зомбак", status: "clean", classId: 10, level: 90 });
      expect(characters[9].name).toBe("Зомбакнзот");
    }
    expect(result.charactersByDifficulty.heroic.map((character) => character.name))
      .toEqual(result.charactersByDifficulty.mythic.map((character) => character.name));
    expect(result.resetStart).toBe("2026-09-30T04:00:00.000Z");
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledWith("application-token", "howling-fjord", "Зомбак", "eu", expect.any(AbortSignal));
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(10);
    expect(api.fetchCharacterProfile).toHaveBeenCalledTimes(10);
  });

  it("calculates independent lockouts from one encounter response and shares profile data", async () => {
    const currentKill = Date.parse("2026-10-01T10:00:00Z");
    const oldKill = Date.parse("2026-09-29T10:00:00Z");
    api.fetchCharacterRaidEncounters.mockResolvedValue(raidHistory(oldKill, currentKill));
    const { getRaidForecast } = await service();
    const result = await getRaidForecast();
    expect(result.charactersByDifficulty.heroic[0]).toMatchObject({
      status: "clean", lastKillAt: new Date(oldKill).toISOString(), classId: 10, level: 90,
    });
    expect(result.charactersByDifficulty.mythic[0]).toMatchObject({
      status: "locked", lastKillAt: new Date(currentKill).toISOString(), classId: 10, level: 90,
    });
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(10);
    expect(api.fetchCharacterProfile).toHaveBeenCalledTimes(10);
  });

  it.each(["heroic", "mythic"] as const)("isolates malformed %s data from the other difficulty", async (difficulty) => {
    const kill = Date.parse("2026-10-01T10:00:00Z");
    api.fetchCharacterRaidEncounters.mockResolvedValue(raidHistory(
      difficulty === "heroic" ? NaN : kill,
      difficulty === "mythic" ? NaN : kill,
    ));
    const { getRaidForecast } = await service();
    const { charactersByDifficulty } = await getRaidForecast();
    expect(charactersByDifficulty[difficulty][0]).toMatchObject({ status: "unknown", lastKillAt: null, classId: 10 });
    expect(charactersByDifficulty[difficulty === "heroic" ? "mythic" : "heroic"][0])
      .toMatchObject({ status: "locked", lastKillAt: new Date(kill).toISOString() });
  });

  it("does not reuse a legacy snapshot left by an older server module", async () => {
    vi.stubGlobal("raidForecastCache", { value: { characters: [] }, expiresAt: Date.now() + 600_000, inFlight: null });
    const { getRaidForecast } = await service();
    const result = await getRaidForecast();
    expect(result.charactersByDifficulty.heroic).toHaveLength(10);
    expect(result.charactersByDifficulty.mythic).toHaveLength(10);
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(10);
  });

  it("does not reuse cached heroic lockouts for the former raid target", async () => {
    const character = { name: "Зомбак", status: "locked", classId: 10, level: 90, lastKillAt: "2026-10-01T10:00:00.000Z" };
    vi.stubGlobal("raidForecastCacheV3", {
      value: {
        charactersByDifficulty: { heroic: [character], mythic: [character] },
        resetStart: "2026-09-30T04:00:00.000Z",
        checkedAt: "2026-10-02T08:59:00.000Z",
      },
      expiresAt: Date.now() + 600_000,
      inFlight: null,
    });
    const { getRaidForecast } = await service();
    const result = await getRaidForecast();
    expect(result.charactersByDifficulty.heroic).toHaveLength(10);
    expect(result.charactersByDifficulty.heroic.every((character) => character.status === "clean")).toBe(true);
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(10);
  });

  it("shares in-flight requests, caches for ten minutes, and returns a fresh server clock", async () => {
    const { getRaidForecast } = await service();
    await Promise.all([getRaidForecast(), getRaidForecast(), getRaidForecast()]);
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(10);
    vi.setSystemTime(new Date("2026-10-02T09:05:00Z"));
    await Promise.all(Array.from({ length: 5 }, () => getRaidForecast()));
    vi.setSystemTime(new Date("2026-10-02T09:09:59.999Z"));
    const cached = await getRaidForecast();
    expect(cached.serverNow).toBe("2026-10-02T09:09:59.999Z");
    expect(cached.checkedAt).toBe("2026-10-02T09:00:00.000Z");
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(10);
    expect(api.fetchCharacterProfile).toHaveBeenCalledTimes(10);
    expect(api.getApplicationAccessToken).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date("2026-10-02T09:10:00Z"));
    await Promise.all([getRaidForecast(), getRaidForecast()]);
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(20);
    expect(api.fetchCharacterProfile).toHaveBeenCalledTimes(20);
    expect(api.getApplicationAccessToken).toHaveBeenCalledTimes(2);
  });

  it("clears previous-week lockouts without bypassing the ten-minute cache or clearing unknown statuses", async () => {
    vi.setSystemTime(new Date("2026-09-30T03:59:59Z"));
    api.fetchCharacterRaidEncounters.mockImplementation((_token: string, _realm: string, name: string) =>
      name === "Зомбак" ? Promise.reject(new Error("unavailable")) : Promise.resolve(raidHistory(
        Date.parse("2026-09-30T03:00:00Z"), Date.parse("2026-09-30T02:00:00Z"),
      )));
    const { getRaidForecast } = await service();
    const beforeReset = await getRaidForecast();
    expect(beforeReset.charactersByDifficulty.heroic[1].status).toBe("locked");
    expect(beforeReset.charactersByDifficulty.mythic[1].status).toBe("locked");
    vi.setSystemTime(new Date("2026-09-30T04:00:00Z"));
    const result = await getRaidForecast();
    expect(result.resetStart).toBe("2026-09-30T04:00:00.000Z");
    expect(result.checkedAt).toBe(beforeReset.checkedAt);
    for (const characters of Object.values(result.charactersByDifficulty)) {
      expect(characters[0].status).toBe("unknown");
      expect(characters.slice(1).every((character) => character.status === "clean")).toBe(true);
    }
    expect(result.charactersByDifficulty.heroic[1].lastKillAt).toBe("2026-09-30T03:00:00.000Z");
    expect(result.charactersByDifficulty.mythic[1].lastKillAt).toBe("2026-09-30T02:00:00.000Z");
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(10);
    vi.setSystemTime(new Date("2026-09-30T04:09:59Z"));
    await getRaidForecast();
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(20);
  });

  it("preserves the shared request and cooldown when server modules reload", async () => {
    let resolveToken!: (token: string) => void;
    api.getApplicationAccessToken.mockReturnValueOnce(new Promise<string>((resolve) => { resolveToken = resolve; }));
    const firstService = await service();
    const pending = firstService.getRaidForecast();
    const reloadedService = await service();
    const otherVisitor = reloadedService.getRaidForecast();
    resolveToken("application-token");
    const [first, second] = await Promise.all([pending, otherVisitor]);
    expect(second).toEqual(first);
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(10);
    vi.setSystemTime(new Date("2026-10-02T09:09:59Z"));
    const afterReload = await service();
    expect((await afterReload.getRaidForecast()).checkedAt).toBe(first.checkedAt);
    expect(api.getApplicationAccessToken).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date("2026-10-02T09:10:00Z"));
    await afterReload.getRaidForecast();
    expect(api.getApplicationAccessToken).toHaveBeenCalledTimes(2);
  });

  it("shares a pending request even if another visitor arrives after the weekly reset", async () => {
    vi.setSystemTime(new Date("2026-09-30T03:59:59Z"));
    let resolveToken!: (token: string) => void;
    api.getApplicationAccessToken.mockReturnValue(new Promise<string>((resolve) => { resolveToken = resolve; }));
    const { getRaidForecast } = await service();
    const beforeReset = getRaidForecast();
    vi.setSystemTime(new Date("2026-09-30T04:00:00Z"));
    const afterReset = getRaidForecast();
    resolveToken("application-token");
    const results = await Promise.all([beforeReset, afterReset]);
    expect(results.every((result) => result.resetStart === "2026-09-30T04:00:00.000Z")).toBe(true);
    expect(api.getApplicationAccessToken).toHaveBeenCalledTimes(1);
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(10);
  });

  it("preserves lockouts if class lookup fails and leaves failed raid lookups unknown", async () => {
    api.fetchCharacterProfile.mockRejectedValue(new Error("profile unavailable"));
    api.fetchCharacterRaidEncounters.mockImplementation((_token: string, _realm: string, name: string) =>
      name === "Зомбак" ? Promise.reject(new Error("404")) : Promise.resolve(raidHistory(
        Date.parse("2026-10-01T10:00:00Z"), Date.parse("2026-10-01T11:00:00Z"),
      )));
    const { getRaidForecast } = await service();
    const result = await getRaidForecast();
    for (const characters of Object.values(result.charactersByDifficulty)) {
      expect(characters[0]).toMatchObject({ name: "Зомбак", status: "unknown", classId: null });
      expect(characters.slice(1).every((character) => character.status === "locked" && character.classId === null)).toBe(true);
    }
  });

  it("returns all ten unknown characters for unavailable credentials", async () => {
    api.getApplicationAccessToken.mockRejectedValue(new Error("secret internal detail"));
    const { getRaidForecast } = await service();
    const result = await getRaidForecast();
    for (const characters of Object.values(result.charactersByDifficulty)) {
      expect(characters).toHaveLength(10);
      expect(characters.every((character) => character.status === "unknown")).toBe(true);
    }
    expect(JSON.stringify(result)).not.toContain("secret internal detail");
    expect(api.fetchCharacterRaidEncounters).not.toHaveBeenCalled();
    vi.setSystemTime(new Date("2026-10-02T09:09:59Z"));
    const cached = await getRaidForecast();
    expect(cached.checkedAt).toBe(result.checkedAt);
    expect(api.getApplicationAccessToken).toHaveBeenCalledTimes(1);
  });
});
