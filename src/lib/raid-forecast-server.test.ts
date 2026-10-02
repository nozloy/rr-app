const api = vi.hoisted(() => ({
  getApplicationAccessToken: vi.fn(), fetchCharacterRaidEncounters: vi.fn(), fetchCharacterProfile: vi.fn(),
}));
vi.mock("@/lib/blizzard-api", () => api);

async function service() {
  vi.resetModules();
  return import("@/lib/raid-forecast-server");
}

describe("forecast data service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T09:00:00Z"));
    vi.resetAllMocks();
    api.getApplicationAccessToken.mockResolvedValue("application-token");
    api.fetchCharacterRaidEncounters.mockResolvedValue({ expansions: [] });
    api.fetchCharacterProfile.mockResolvedValue({ character_class: { id: 10 }, level: 90 });
  });
  afterEach(() => vi.useRealTimers());

  it("keeps the fixed roster in order and fetches it without a user session", async () => {
    const { getRaidForecast } = await service();
    const result = await getRaidForecast();
    expect(result.characters).toHaveLength(10);
    expect(result.characters[0]).toMatchObject({ name: "Зомбак", status: "clean", classId: 10, level: 90 });
    expect(result.characters[9].name).toBe("Зомбакнзот");
    expect(result.resetStart).toBe("2026-09-30T04:00:00.000Z");
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledWith("application-token", "howling-fjord", "Зомбак", "eu", expect.any(AbortSignal));
  });

  it("shares in-flight requests, caches for 60 seconds, and returns a fresh server clock", async () => {
    const { getRaidForecast } = await service();
    await Promise.all([getRaidForecast(), getRaidForecast(), getRaidForecast()]);
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(10);
    vi.setSystemTime(new Date("2026-10-02T09:00:59Z"));
    const cached = await getRaidForecast();
    expect(cached.serverNow).toBe("2026-10-02T09:00:59.000Z");
    expect(cached.checkedAt).toBe("2026-10-02T09:00:00.000Z");
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(10);
    vi.setSystemTime(new Date("2026-10-02T09:01:00Z"));
    await getRaidForecast();
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(20);
  });

  it("does not carry a cache across Wednesday reset, even within its TTL", async () => {
    vi.setSystemTime(new Date("2026-09-30T03:59:59Z"));
    const { getRaidForecast } = await service();
    await getRaidForecast();
    vi.setSystemTime(new Date("2026-09-30T04:00:00Z"));
    const result = await getRaidForecast();
    expect(result.resetStart).toBe("2026-09-30T04:00:00.000Z");
    expect(api.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(20);
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
  });
});
