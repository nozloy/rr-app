const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    wowCharacter: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function tokenResponse() {
  return jsonResponse({
    access_token: "wcl-token",
    expires_in: 3600,
  });
}

function zonesResponse() {
  return jsonResponse({
    data: {
      worldData: {
        zones: [
          {
            id: 45,
            name: "Old Raid",
            frozen: true,
            difficulties: [
              { id: 4, name: "Heroic" },
              { id: 5, name: "Mythic" },
            ],
          },
          {
            id: 46,
            name: "VS / DR / MQD",
            frozen: false,
            difficulties: [
              { id: 4, name: "Heroic" },
              { id: 5, name: "Mythic" },
            ],
          },
        ],
      },
    },
  });
}

function zonesWithSporefallResponse() {
  return jsonResponse({
    data: {
      worldData: {
        zones: [
          {
            id: 46,
            name: "VS / DR / MQD",
            frozen: false,
            difficulties: [
              { id: 4, name: "Heroic" },
              { id: 5, name: "Mythic" },
            ],
          },
          {
            id: 50,
            name: "Sporefall",
            frozen: false,
            difficulties: [
              { id: 4, name: "Heroic" },
              { id: 5, name: "Mythic" },
            ],
          },
        ],
      },
    },
  });
}

function characterResponse(character: unknown) {
  return jsonResponse({
    data: {
      characterData: {
        character,
      },
    },
  });
}

function rankingCharacter(overrides: Record<string, unknown> = {}) {
  return {
    id: 777,
    name: "Clean",
    heroicRankings: {
      bestPerformanceAverage: 85,
      rankings: [
        {
          encounter: { name: "Imperator Averzian" },
          rankPercent: 94.6,
        },
      ],
    },
    mythicRankings: { rankings: [] },
    gameData: {
      averageItemLevel: 710,
      gear: [{ id: 1, name: "Arcane Blade", slot: "Main Hand", itemLevel: 720 }],
    },
    ...overrides,
  };
}

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "wow-1",
    name: "Clean",
    serverSlug: "draenor",
    serverRegion: "eu",
    warcraftLogsId: null,
    lastFetchedAt: null,
    rankingsJson: null,
    gearJson: null,
    averageParse: null,
    bestParse: null,
    raidStatsJson: null,
    createdAt: new Date("2026-06-15T10:00:00.000Z"),
    updatedAt: new Date("2026-06-15T10:00:00.000Z"),
    ...overrides,
  };
}

async function recordFromRankingUpdate({
  data,
}: {
  data: Record<string, unknown>;
}) {
  return baseRecord({
    warcraftLogsId: data.warcraftLogsId,
    lastFetchedAt: data.lastFetchedAt,
    averageParse: data.averageParse,
    bestParse: data.bestParse,
    raidStatsJson: data.raidStatsJson,
    gearJson: data.gearJson,
  });
}

async function loadApi() {
  vi.resetModules();
  return import("@/lib/warcraftlogs-api");
}

describe("warcraftlogs api cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    vi.stubEnv("WARCRAFTLOGS_CLIENT_ID", '"client-id"');
    vi.stubEnv("WARCRAFTLOGS_CLIENT_SECRET", '"client-secret"');
    vi.stubGlobal("fetch", vi.fn());
    prismaMock.wowCharacter.findUnique.mockReset();
    prismaMock.wowCharacter.update.mockReset();
    prismaMock.wowCharacter.upsert.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses trimmed client credentials and stores not-found lookups", async () => {
    const fetchMock = vi.mocked(fetch);
    const notFoundRecord = baseRecord({
      lastFetchedAt: new Date("2026-06-15T12:00:00.000Z"),
    });

    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(zonesResponse())
      .mockResolvedValueOnce(characterResponse(null));
    prismaMock.wowCharacter.findUnique.mockResolvedValue(null);
    prismaMock.wowCharacter.upsert.mockResolvedValue(baseRecord());
    prismaMock.wowCharacter.update.mockResolvedValue(notFoundRecord);

    const { getWarcraftLogsCharacterDetails } = await loadApi();
    const result = await getWarcraftLogsCharacterDetails({
      name: "Clean",
      serverSlug: "draenor",
      serverRegion: "eu",
    });

    const expectedAuth = `Basic ${Buffer.from("client-id:client-secret").toString(
      "base64",
    )}`;
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://www.warcraftlogs.com/oauth/token",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expectedAuth }),
      }),
    );
    expect(result.status).toBe("not_found");
    expect(prismaMock.wowCharacter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          warcraftLogsId: null,
          lastFetchedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("returns fresh cache without fetching Warcraft Logs", async () => {
    const cachedRecord = baseRecord({
      warcraftLogsId: 123,
      lastFetchedAt: new Date("2026-06-15T11:30:00.000Z"),
      averageParse: 88.2,
      bestParse: 95.1,
      raidStatsJson: {
        zoneId: 46,
        zoneName: "VS / DR / MQD",
        heroic: null,
        mythic: null,
      },
      gearJson: {
        itemLevel: 710,
        items: [],
      },
    });

    prismaMock.wowCharacter.findUnique.mockResolvedValue(cachedRecord);

    const { getWarcraftLogsCharacterDetails } = await loadApi();
    const result = await getWarcraftLogsCharacterDetails({
      name: "Clean",
      serverSlug: "draenor",
      serverRegion: "eu",
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "ready",
      warcraftLogsId: 123,
      summary: {
        averageParse: 88.2,
        bestParse: 95.1,
      },
    });
  });

  it("refreshes stale cache and normalizes rankings", async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(zonesResponse())
      .mockResolvedValueOnce(characterResponse(rankingCharacter()));
    prismaMock.wowCharacter.findUnique.mockResolvedValue(
      baseRecord({
        lastFetchedAt: new Date("2026-06-14T10:00:00.000Z"),
      }),
    );
    prismaMock.wowCharacter.upsert.mockResolvedValue(baseRecord());
    prismaMock.wowCharacter.update.mockImplementation(recordFromRankingUpdate);

    const { getWarcraftLogsCharacterDetails } = await loadApi();
    const result = await getWarcraftLogsCharacterDetails({
      name: "Clean",
      serverSlug: "draenor",
      serverRegion: "eu",
    });

    expect(result).toMatchObject({
      status: "ready",
      warcraftLogsId: 777,
      summary: {
        averageParse: 85,
        bestParse: 94.6,
      },
      rankings: {
        heroic: {
          zoneId: 46,
          zoneName: "VS / DR / MQD",
          encounters: [{ name: "Imperator Averzian", parse: 94.6 }],
        },
      },
      gear: {
        itemLevel: 710,
        items: [{ name: "Arcane Blade", itemLevel: 720 }],
      },
    });
  });

  it("uses the manually selected raid zone instead of the newest active zone", async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(zonesWithSporefallResponse())
      .mockResolvedValueOnce(characterResponse(rankingCharacter()));
    prismaMock.wowCharacter.findUnique.mockResolvedValue(null);
    prismaMock.wowCharacter.upsert.mockResolvedValue(baseRecord());
    prismaMock.wowCharacter.update.mockImplementation(recordFromRankingUpdate);

    const { getWarcraftLogsCharacterDetails } = await loadApi();
    const result = await getWarcraftLogsCharacterDetails(
      {
        name: "Clean",
        serverSlug: "draenor",
        serverRegion: "eu",
      },
      { raidSlug: "the-voidspire" },
    );
    const characterRequest = fetchMock.mock.calls[2][1] as RequestInit;
    const characterRequestBody = JSON.parse(String(characterRequest.body));

    expect(characterRequestBody.variables.zoneID).toBe(46);
    expect(result.rankings.heroic?.zoneId).toBe(46);
    expect(result.rankings.heroic?.zoneName).toBe("VS / DR / MQD");
  });

  it("refreshes fresh cached logs when they belong to another raid zone", async () => {
    const fetchMock = vi.mocked(fetch);
    const cachedRecord = baseRecord({
      warcraftLogsId: 123,
      lastFetchedAt: new Date("2026-06-15T11:30:00.000Z"),
      averageParse: 21.5,
      bestParse: 23,
      raidStatsJson: {
        zoneId: 50,
        zoneName: "Sporefall",
        heroic: null,
        mythic: null,
      },
      gearJson: {
        itemLevel: 710,
        items: [],
      },
    });

    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(zonesWithSporefallResponse())
      .mockResolvedValueOnce(characterResponse(rankingCharacter({ id: 778 })));
    prismaMock.wowCharacter.findUnique.mockResolvedValue(cachedRecord);
    prismaMock.wowCharacter.upsert.mockResolvedValue(cachedRecord);
    prismaMock.wowCharacter.update.mockImplementation(recordFromRankingUpdate);

    const { getWarcraftLogsCharacterDetails } = await loadApi();
    const result = await getWarcraftLogsCharacterDetails(
      {
        name: "Clean",
        serverSlug: "draenor",
        serverRegion: "eu",
      },
      { raidSlug: "the-voidspire" },
    );
    const characterRequest = fetchMock.mock.calls[2][1] as RequestInit;
    const characterRequestBody = JSON.parse(String(characterRequest.body));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(characterRequestBody.variables.zoneID).toBe(46);
    expect(result.warcraftLogsId).toBe(778);
    expect(result.summary).toMatchObject({
      averageParse: 85,
      bestParse: 94.6,
    });
  });
});
