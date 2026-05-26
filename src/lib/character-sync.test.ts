const { prismaMock, blizzardApiMock, MockBattleNetAuthError } = vi.hoisted(
  () => {
    class HoistedBattleNetAuthError extends Error {}

    return {
      prismaMock: {
        account: {
          findFirst: vi.fn(),
        },
        character: {
          findUnique: vi.fn(),
          upsert: vi.fn(),
          updateMany: vi.fn(),
        },
      },
      blizzardApiMock: {
        getBattleNetAccount: vi.fn(),
        getValidAccessToken: vi.fn(),
        fetchAccountCharacters: vi.fn(),
        fetchCharacterProfile: vi.fn(),
        fetchCharacterEquipment: vi.fn(),
        fetchCharacterMedia: vi.fn(),
        fetchPublicCharacterSummary: vi.fn(),
      },
      MockBattleNetAuthError: HoistedBattleNetAuthError,
    };
  },
);

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/blizzard-api", () => ({
  BattleNetAuthError: MockBattleNetAuthError,
  ...blizzardApiMock,
}));

import { syncCharactersForUser } from "@/lib/character-sync";

describe("syncCharactersForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    blizzardApiMock.getBattleNetAccount.mockResolvedValue({
      id: "account-1",
      access_token: "token",
    });
    blizzardApiMock.getValidAccessToken.mockResolvedValue("token");
    prismaMock.character.updateMany.mockResolvedValue({ count: 0 });
    blizzardApiMock.fetchPublicCharacterSummary.mockResolvedValue({
      itemLevel: null,
      activeSpec: null,
    });
  });

  it("imports characters on first sync", async () => {
    blizzardApiMock.fetchAccountCharacters.mockResolvedValue([
      {
        id: 1,
        name: "Aeloria",
        level: 90,
        realm: { slug: "howling-fjord", name: "Ревущий фьорд" },
        playable_class: { name: "Жрец" },
        playable_race: { name: "Эльф крови" },
        faction: { name: "Орда" },
      },
    ]);
    blizzardApiMock.fetchCharacterProfile.mockResolvedValue({
      id: 1,
      realm: { slug: "howling-fjord", name: "Ревущий фьорд" },
      character_class: { name: "Жрец" },
    });
    blizzardApiMock.fetchCharacterEquipment.mockResolvedValue({
      equipped_item_level: 670,
    });
    blizzardApiMock.fetchCharacterMedia.mockResolvedValue({
      assets: [{ key: "avatar", value: "https://example.com/avatar.jpg" }],
    });
    prismaMock.character.findUnique.mockResolvedValue(null);
    prismaMock.character.upsert.mockResolvedValue({});

    const result = await syncCharactersForUser("user-1");

    expect(result.status).toBe("success");
    expect(result.importedCount).toBe(1);
    expect(result.updatedCount).toBe(0);
    expect(prismaMock.character.upsert).toHaveBeenCalledTimes(1);
  });

  it("counts existing characters as updates on repeated sync", async () => {
    blizzardApiMock.fetchAccountCharacters.mockResolvedValue([
      {
        id: 1,
        name: "Aeloria",
        level: 90,
        realm: { slug: "howling-fjord", name: "Ревущий фьорд" },
        playable_class: { name: "Жрец" },
      },
    ]);
    blizzardApiMock.fetchCharacterProfile.mockResolvedValue({
      id: 1,
      realm: { slug: "howling-fjord", name: "Ревущий фьорд" },
      character_class: { name: "Жрец" },
    });
    blizzardApiMock.fetchCharacterEquipment.mockResolvedValue({
      equipped_item_level: 675,
    });
    blizzardApiMock.fetchCharacterMedia.mockResolvedValue({ assets: [] });
    prismaMock.character.findUnique.mockResolvedValue({ id: "char-1" });
    prismaMock.character.upsert.mockResolvedValue({});

    const result = await syncCharactersForUser("user-1");

    expect(result.status).toBe("success");
    expect(result.importedCount).toBe(0);
    expect(result.updatedCount).toBe(1);
  });

  it("keeps importing when one character detail request fails", async () => {
    blizzardApiMock.fetchAccountCharacters.mockResolvedValue([
      {
        id: 1,
        name: "Aeloria",
        level: 90,
        realm: { slug: "howling-fjord", name: "Ревущий фьорд" },
        playable_class: { name: "Жрец" },
      },
      {
        id: 2,
        name: "Brakk",
        level: 90,
        realm: { slug: "ragnaros", name: "Рагнарос" },
        playable_class: { name: "Воин" },
      },
    ]);
    blizzardApiMock.fetchCharacterProfile
      .mockResolvedValueOnce({
        id: 1,
        realm: { slug: "howling-fjord", name: "Ревущий фьорд" },
      })
      .mockRejectedValueOnce(new Error("profile failed"));
    blizzardApiMock.fetchCharacterEquipment.mockResolvedValue({
      equipped_item_level: 671,
    });
    blizzardApiMock.fetchCharacterMedia.mockResolvedValue({ assets: [] });
    prismaMock.character.findUnique.mockResolvedValue(null);
    prismaMock.character.upsert.mockResolvedValue({});

    const result = await syncCharactersForUser("user-1");

    expect(result.status).toBe("success");
    expect(result.importedCount).toBe(2);
    expect(result.failedCount).toBe(0);
  });

  it("imports character from account summary when detail endpoints fail", async () => {
    blizzardApiMock.fetchAccountCharacters.mockResolvedValue([
      {
        id: 1,
        name: "Элешмэн",
        level: 45,
        realm: { slug: "azuregos", name: "Азурегос" },
        playable_class: { name: "Паладин" },
        playable_race: { name: "Дреней" },
        faction: { name: "Альянс" },
      },
    ]);
    blizzardApiMock.fetchCharacterProfile.mockRejectedValue(new Error("404"));
    blizzardApiMock.fetchCharacterEquipment.mockRejectedValue(new Error("404"));
    blizzardApiMock.fetchCharacterMedia.mockRejectedValue(new Error("404"));
    prismaMock.character.findUnique.mockResolvedValue(null);
    prismaMock.character.upsert.mockResolvedValue({});

    const result = await syncCharactersForUser("user-1");

    expect(result.status).toBe("success");
    expect(result.importedCount).toBe(1);
    expect(result.updatedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(prismaMock.character.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          name: "Элешмэн",
          realm: "Азурегос",
          realmSlug: "azuregos",
          className: "Паладин",
          raceName: "Дреней",
          factionName: "Альянс",
          level: 45,
          itemLevel: 0,
          thumbnailUrl: null,
          avatarUrl: null,
        }),
      }),
    );
  });

  it("uses public armory data when detail endpoints are unavailable", async () => {
    blizzardApiMock.fetchAccountCharacters.mockResolvedValue([
      {
        id: 1,
        name: "Латтэ",
        level: 90,
        realm: { slug: "howling-fjord", name: "Ревущий фьорд" },
        playable_class: { name: "Охотник на демонов" },
        playable_race: { name: "Эльф крови" },
        faction: { name: "Орда" },
      },
    ]);
    blizzardApiMock.fetchCharacterProfile.mockRejectedValue(new Error("404"));
    blizzardApiMock.fetchCharacterEquipment.mockRejectedValue(new Error("404"));
    blizzardApiMock.fetchCharacterMedia.mockRejectedValue(new Error("404"));
    blizzardApiMock.fetchPublicCharacterSummary.mockResolvedValue({
      itemLevel: 272,
      activeSpec: "Месть",
    });
    prismaMock.character.findUnique.mockResolvedValue(null);
    prismaMock.character.upsert.mockResolvedValue({});

    const result = await syncCharactersForUser("user-1");

    expect(result.status).toBe("success");
    expect(result.importedCount).toBe(1);
    expect(prismaMock.character.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          activeSpec: "Месть",
          itemLevel: 272,
        }),
      }),
    );
  });

  it("asks for reconnect when battle.net rejects auth", async () => {
    blizzardApiMock.fetchAccountCharacters.mockRejectedValue(
      new MockBattleNetAuthError("401"),
    );

    const result = await syncCharactersForUser("user-1");

    expect(result.status).toBe("reauth");
    expect(result.message).toContain("Battle.net");
  });
});
