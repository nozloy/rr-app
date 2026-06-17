import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, blizzardApiMock, MockBlizzardApiRequestError } = vi.hoisted(
  () => {
    class HoistedBlizzardApiRequestError extends Error {
      constructor(
        message: string,
        public readonly status: number,
      ) {
        super(message);
      }
    }

    return {
      prismaMock: {
        wowCharacter: {
          findUnique: vi.fn(),
          update: vi.fn(),
          upsert: vi.fn(),
        },
      },
      blizzardApiMock: {
        getApplicationAccessToken: vi.fn(),
        fetchCharacterEquipment: vi.fn(),
      },
      MockBlizzardApiRequestError: HoistedBlizzardApiRequestError,
    };
  },
);

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/blizzard-api", () => ({
  BlizzardApiRequestError: MockBlizzardApiRequestError,
  ...blizzardApiMock,
}));

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
  return import("@/lib/blizzard-equipment-api");
}

describe("blizzard equipment api cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T12:00:00.000Z"));
    prismaMock.wowCharacter.findUnique.mockReset();
    prismaMock.wowCharacter.update.mockReset();
    prismaMock.wowCharacter.upsert.mockReset();
    blizzardApiMock.getApplicationAccessToken.mockReset();
    blizzardApiMock.fetchCharacterEquipment.mockReset();
    blizzardApiMock.getApplicationAccessToken.mockResolvedValue("token");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns fresh cache without fetching Blizzard equipment", async () => {
    prismaMock.wowCharacter.findUnique.mockResolvedValue(
      baseRecord({
        blizzardEquipmentFetchedAt: new Date("2026-06-17T11:30:00.000Z"),
        blizzardEquippedItemLevel: 710,
        blizzardEquipmentJson: {
          itemLevel: 710,
          topItem: { name: "Arcane Blade", itemLevel: 720 },
          items: [{ name: "Arcane Blade", itemLevel: 720 }],
        },
      }),
    );

    const { getBlizzardEquipmentDetails } = await loadApi();
    const result = await getBlizzardEquipmentDetails({
      name: "Mahita",
      serverSlug: "Hyjal",
      serverRegion: "EU",
    });

    expect(blizzardApiMock.fetchCharacterEquipment).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "ready",
      itemLevel: 710,
      topItem: { name: "Arcane Blade" },
    });
  });

  it("force refreshes fresh cache and stores normalized equipment", async () => {
    prismaMock.wowCharacter.findUnique.mockResolvedValue(
      baseRecord({
        blizzardEquipmentFetchedAt: new Date("2026-06-17T11:30:00.000Z"),
        blizzardEquippedItemLevel: 700,
      }),
    );
    prismaMock.wowCharacter.upsert.mockResolvedValue(baseRecord());
    prismaMock.wowCharacter.update.mockImplementation(recordFromUpdate);
    blizzardApiMock.fetchCharacterEquipment.mockResolvedValue({
      equipped_item_level: 712,
      equipped_items: [
        {
          item: { id: 1, name: "Arcane Blade" },
          slot: { name: "Main Hand" },
          quality: { name: "Epic" },
          level: { value: 720 },
        },
      ],
    });

    const { getBlizzardEquipmentDetails } = await loadApi();
    const result = await getBlizzardEquipmentDetails(
      {
        name: "Mahita",
        serverSlug: "Hyjal",
        serverRegion: "EU",
      },
      { forceRefresh: true },
    );

    expect(blizzardApiMock.getApplicationAccessToken).toHaveBeenCalledWith("eu");
    expect(blizzardApiMock.fetchCharacterEquipment).toHaveBeenCalledWith(
      "token",
      "hyjal",
      "Mahita",
      "eu",
    );
    expect(result).toMatchObject({
      status: "ready",
      itemLevel: 712,
      topItem: { name: "Arcane Blade", itemLevel: 720 },
    });
  });

  it("stores not-found Blizzard equipment lookups", async () => {
    prismaMock.wowCharacter.findUnique.mockResolvedValue(null);
    prismaMock.wowCharacter.upsert.mockResolvedValue(baseRecord());
    prismaMock.wowCharacter.update.mockImplementation(recordFromUpdate);
    blizzardApiMock.fetchCharacterEquipment.mockRejectedValue(
      new MockBlizzardApiRequestError("missing", 404),
    );

    const { getBlizzardEquipmentDetails } = await loadApi();
    const result = await getBlizzardEquipmentDetails({
      name: "Missing",
      serverSlug: "hyjal",
      serverRegion: "eu",
    });

    expect(result.status).toBe("not_found");
    expect(prismaMock.wowCharacter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blizzardEquippedItemLevel: null,
          blizzardEquipmentFetchedAt: expect.any(Date),
        }),
      }),
    );
  });
});
