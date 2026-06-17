export {};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function loadApi() {
  vi.resetModules();
  return import("@/lib/blizzard-api");
}

describe("blizzard api regions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses EU profile endpoints by default", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ assets: [] }));

    const { fetchCharacterMedia } = await loadApi();
    await fetchCharacterMedia("token", "draenor", "Clean");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://eu.api.blizzard.com/profile/wow/character/draenor/clean/character-media?namespace=profile-eu&locale=ru_RU",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
  });

  it("uses US profile endpoints for US raid checks", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ expansions: [] }));

    const { fetchCharacterRaidEncounters } = await loadApi();
    await fetchCharacterRaidEncounters("token", "draenor", "Clean", "us");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://us.api.blizzard.com/profile/wow/character/draenor/clean/encounters/raids?namespace=profile-us&locale=en_US",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
  });

  it("uses US dynamic realm index when resolving realms missing from the local catalog", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        realms: [{ name: "Future Realm", slug: "future-realm" }],
      }),
    );

    const { resolveRealmSlug } = await loadApi();
    await expect(resolveRealmSlug("token", "Future Realm", "us")).resolves.toBe(
      "future-realm",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://us.api.blizzard.com/data/wow/realm/index?namespace=dynamic-us&locale=en_US",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
  });

  it("resolves legacy normalized Cyrillic realm names through the local catalog", async () => {
    const fetchMock = vi.mocked(fetch);

    const { resolveRealmSlug } = await loadApi();
    await expect(resolveRealmSlug("token", "Ревущийфьорд", "eu")).resolves.toBe(
      "howling-fjord",
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves compact connected realm names through the local catalog", async () => {
    const fetchMock = vi.mocked(fetch);

    const { resolveRealmSlug } = await loadApi();
    await expect(resolveRealmSlug("token", "TarrenMill", "eu")).resolves.toBe(
      "tarren-mill",
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
