const api = vi.hoisted(() => ({
  getApplicationAccessToken: vi.fn(), fetchCharacterRaidEncounters: vi.fn(), fetchCharacterProfile: vi.fn(),
}));
vi.mock("@/lib/blizzard-api", () => api);
vi.mock("next/cache", () => ({ unstable_cache: (callback: () => Promise<unknown>) => callback }));

async function service() {
  vi.resetModules();
  return import("@/lib/raid-forecast-server");
}

describe("forecast data service", () => {
  beforeEach(() => {
    vi.stubGlobal("raidForecastCache", undefined);
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
    expect(result.characters).toHaveLength(10);
    expect(result.characters[0]).toMatchObject({ name: "Зомбак", status: "clean", classId: 10, level: 90 });
    expect(result.characters[9].name).toBe("Зомбакнзот");
    expect(result.resetStart).toBe("2026-09-30T04:00:00.000Z");
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledWith("application-token", "howling-fjord", "Зомбак", "eu", expect.any(AbortSignal));
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
      name === "Зомбак" ? Promise.reject(new Error("unavailable")) : Promise.resolve({
        expansions: [{ instances: [{ instance: { id: 1317 }, modes: [{
          difficulty: { type: "HEROIC" },
          progress: { encounters: [{ encounter: { id: 2849 }, last_kill_timestamp: Date.parse("2026-09-30T03:00:00Z") }] },
        }] }] }],
      }));
    const { getRaidForecast } = await service();
    const beforeReset = await getRaidForecast();
    expect(beforeReset.characters[1].status).toBe("locked");
    vi.setSystemTime(new Date("2026-09-30T04:00:00Z"));
    const result = await getRaidForecast();
    expect(result.resetStart).toBe("2026-09-30T04:00:00.000Z");
    expect(result.checkedAt).toBe(beforeReset.checkedAt);
    expect(result.characters[0].status).toBe("unknown");
    expect(result.characters.slice(1).every((character) => character.status === "clean")).toBe(true);
    expect(result.characters[1].lastKillAt).toBe("2026-09-30T03:00:00.000Z");
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
      name === "Зомбак" ? Promise.reject(new Error("404")) : Promise.resolve({ expansions: [] }));
    const { getRaidForecast } = await service();
    const result = await getRaidForecast();
    expect(result.characters[0]).toMatchObject({ name: "Зомбак", status: "unknown", classId: null });
    expect(result.characters.slice(1).every((character) => character.status === "clean")).toBe(true);
  });

  it("returns all ten unknown characters for unavailable credentials", async () => {
    api.getApplicationAccessToken.mockRejectedValue(new Error("secret internal detail"));
    const { getRaidForecast } = await service();
    const result = await getRaidForecast();
    expect(result.characters).toHaveLength(10);
    expect(result.characters.every((character) => character.status === "unknown")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("secret internal detail");
    expect(api.fetchCharacterRaidEncounters).not.toHaveBeenCalled();
    vi.setSystemTime(new Date("2026-10-02T09:09:59Z"));
    const cached = await getRaidForecast();
    expect(cached.checkedAt).toBe(result.checkedAt);
    expect(api.getApplicationAccessToken).toHaveBeenCalledTimes(1);
  });
});
