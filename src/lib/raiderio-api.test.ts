import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "wow-1",
    name: "Mahita",
    serverSlug: "hyjal",
    serverRegion: "eu",
    warcraftLogsId: null,
    lastFetchedAt: null,
    rankingsJson: null,
    gearJson: null,
    averageParse: null,
    bestParse: null,
    raidStatsJson: null,
    raiderIoProfileJson: null,
    raiderIoScore: null,
    raiderIoProfileUrl: null,
    raiderIoFetchedAt: null,
    blizzardEquipmentJson: null,
    blizzardEquippedItemLevel: null,
    blizzardTopItemJson: null,
    blizzardEquipmentFetchedAt: null,
    createdAt: new Date("2026-06-17T10:00:00.000Z"),
    updatedAt: new Date("2026-06-17T10:00:00.000Z"),
    ...overrides,
  };
}

async function recordFromUpdate({ data }: { data: Record<string, unknown> }) {
  return baseRecord(data);
}

async function loadApi() {
  vi.resetModules();
  return import("@/lib/raiderio-api");
}

describe("raiderio api cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T12:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn());
    prismaMock.wowCharacter.findUnique.mockReset();
    prismaMock.wowCharacter.update.mockReset();
    prismaMock.wowCharacter.upsert.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns fresh cache without fetching Raider.IO", async () => {
    prismaMock.wowCharacter.findUnique.mockResolvedValue(
      baseRecord({
        raiderIoFetchedAt: new Date("2026-06-17T11:30:00.000Z"),
        raiderIoScore: 3248.2,
        raiderIoProfileUrl: "https://raider.io/characters/eu/hyjal/Mahita",
        raiderIoProfileJson: {
          score: 3248.2,
          profileUrl: "https://raider.io/characters/eu/hyjal/Mahita",
        },
      }),
    );

    const { getRaiderIoCharacterDetails } = await loadApi();
    const result = await getRaiderIoCharacterDetails({
      name: "Mahita",
      serverSlug: "Hyjal",
      serverRegion: "EU",
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "ready",
      score: 3248.2,
      profileUrl: "https://raider.io/characters/eu/hyjal/Mahita",
    });
  });

  it("refreshes stale cache and stores normalized profile data", async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        name: "Mahita",
        profile_url: "https://raider.io/characters/eu/hyjal/Mahita",
        mythic_plus_scores_by_season: [{ scores: { all: 3248.18 } }],
        mythic_plus_ranks: { overall: { region: 1200 } },
      }),
    );
    prismaMock.wowCharacter.findUnique.mockResolvedValue(
      baseRecord({ raiderIoFetchedAt: new Date("2026-06-15T11:30:00.000Z") }),
    );
    prismaMock.wowCharacter.upsert.mockResolvedValue(baseRecord());
    prismaMock.wowCharacter.update.mockImplementation(recordFromUpdate);

    const { getRaiderIoCharacterDetails } = await loadApi();
    const result = await getRaiderIoCharacterDetails({
      name: "Mahita",
      serverSlug: "Hyjal",
      serverRegion: "EU",
    });
    const requestUrl = String(fetchMock.mock.calls[0][0]);

    expect(requestUrl).toContain("region=eu");
    expect(requestUrl).toContain("realm=hyjal");
    expect(requestUrl).toContain("mythic_plus_scores_by_season%3Acurrent");
    expect(result).toMatchObject({
      status: "ready",
      score: 3248.2,
    });
    expect(prismaMock.wowCharacter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          raiderIoScore: 3248.2,
          raiderIoFetchedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("stores not-found Raider.IO lookups", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "missing" }, 404));
    prismaMock.wowCharacter.findUnique.mockResolvedValue(null);
    prismaMock.wowCharacter.upsert.mockResolvedValue(baseRecord());
    prismaMock.wowCharacter.update.mockImplementation(recordFromUpdate);

    const { getRaiderIoCharacterDetails } = await loadApi();
    const result = await getRaiderIoCharacterDetails({
      name: "Missing",
      serverSlug: "hyjal",
      serverRegion: "eu",
    });

    expect(result.status).toBe("not_found");
    expect(prismaMock.wowCharacter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          raiderIoScore: null,
          raiderIoFetchedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("returns an error when Raider.IO rate limits without stale cache", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "rate" }, 429));
    prismaMock.wowCharacter.findUnique.mockResolvedValue(null);
    prismaMock.wowCharacter.upsert.mockResolvedValue(baseRecord());

    const { getRaiderIoCharacterDetails } = await loadApi();
    const result = await getRaiderIoCharacterDetails({
      name: "Mahita",
      serverSlug: "hyjal",
      serverRegion: "eu",
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("rate limit");
  });
});
