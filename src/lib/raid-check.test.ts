import {
  ADDON_EXPORT_PREFIX,
  ADDON_RR2_EXPORT_PREFIX,
} from "@/lib/addon-export";
import type { BlizzardCharacterRaidEncounters } from "@/lib/blizzard-api";
import { ALL_SEASON_RAIDS_VALUE } from "@/lib/raid-check-core";
import { REALM_CODE_ENTRIES, type RealmRegion } from "@/lib/realm-codes";

const { blizzardApiMock, MockBattleNetAuthError, MockBlizzardApiRequestError } =
  vi.hoisted(() => {
    class HoistedBattleNetAuthError extends Error {}
    class HoistedBlizzardApiRequestError extends Error {
      constructor(
        message: string,
        public readonly status: number,
      ) {
        super(message);
      }
    }

    return {
      blizzardApiMock: {
        fetchCharacterMedia: vi.fn(),
        fetchCharacterRaidEncounters: vi.fn(),
        getApplicationAccessToken: vi.fn(),
        resolveRealmSlug: vi.fn(),
      },
      MockBattleNetAuthError: HoistedBattleNetAuthError,
      MockBlizzardApiRequestError: HoistedBlizzardApiRequestError,
    };
  });

vi.mock("@/lib/blizzard-api", () => ({
  BattleNetAuthError: MockBattleNetAuthError,
  BlizzardApiRequestError: MockBlizzardApiRequestError,
  fetchCharacterMedia: blizzardApiMock.fetchCharacterMedia,
  fetchCharacterRaidEncounters: blizzardApiMock.fetchCharacterRaidEncounters,
  getApplicationAccessToken: blizzardApiMock.getApplicationAccessToken,
  resolveRealmSlug: blizzardApiMock.resolveRealmSlug,
}));

import { checkRaidLockoutsForExport } from "@/lib/raid-check";

function makeExport(params: Record<string, string>) {
  return `${ADDON_EXPORT_PREFIX}${new URLSearchParams(params).toString()}`;
}

function makeRr2Export(params: Record<string, string>) {
  return `${ADDON_RR2_EXPORT_PREFIX}${new URLSearchParams(params).toString()}`;
}

function realmCode(region: RealmRegion, slug: string) {
  const entry = REALM_CODE_ENTRIES.find(
    (item) => item.region === region && item.slug === slug,
  );

  if (!entry) {
    throw new Error(`Missing realm code for ${region}/${slug}.`);
  }

  return entry.code;
}

function makeEncounterSummary(killTimestamp?: number): BlizzardCharacterRaidEncounters {
  return {
    expansions: [
      {
        instances: [
          {
            instance: {
              name: "The Voidspire",
            },
            modes: [
              {
                difficulty: {
                  type: "HEROIC",
                  name: "Heroic",
                },
                progress: {
                  encounters: [
                    {
                      encounter: {
                        name: "Imperator Averzian",
                      },
                      completed_count: killTimestamp ? 1 : 0,
                      last_kill_timestamp: killTimestamp,
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeSeasonEncounterSummary(): BlizzardCharacterRaidEncounters {
  return {
    expansions: [
      {
        instances: [
          {
            instance: {
              name: "The Dreamrift",
            },
            modes: [
              {
                difficulty: {
                  type: "HEROIC",
                  name: "Heroic",
                },
                progress: {
                  encounters: [
                    {
                      encounter: {
                        name: "Dreamrift Sentinel",
                      },
                      completed_count: 1,
                      last_kill_timestamp: Date.parse("2026-05-20T09:00:00.000Z"),
                    },
                  ],
                },
              },
            ],
          },
          {
            instance: {
              name: "The Voidspire",
            },
            modes: [
              {
                difficulty: {
                  type: "HEROIC",
                  name: "Heroic",
                },
                progress: {
                  encounters: [
                    {
                      encounter: {
                        name: "Imperator Averzian",
                      },
                      completed_count: 1,
                      last_kill_timestamp: Date.parse("2026-05-21T10:00:00.000Z"),
                    },
                  ],
                },
              },
            ],
          },
          {
            instance: {
              name: "Sporefall",
            },
            modes: [
              {
                difficulty: {
                  type: "HEROIC",
                  name: "Heroic",
                },
                progress: {
                  encounters: [
                    {
                      encounter: {
                        name: "Rotmire",
                      },
                      completed_count: 1,
                      last_kill_timestamp: Date.parse("2026-05-22T11:00:00.000Z"),
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("raid check", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T12:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    blizzardApiMock.getApplicationAccessToken.mockResolvedValue("app-token");
    blizzardApiMock.fetchCharacterMedia.mockResolvedValue({
      assets: [
        { key: "inset", value: "https://render.worldofwarcraft.com/inset.jpg" },
        { key: "avatar", value: "https://render.worldofwarcraft.com/avatar.jpg" },
      ],
    });
    blizzardApiMock.resolveRealmSlug.mockImplementation(
      async (_token: string, realm: string) => {
        if (realm === "Missing Realm") {
          return null;
        }

        return realm === "Ревущий фьорд" ? "howling-fjord" : "draenor";
      },
    );
    blizzardApiMock.fetchCharacterRaidEncounters.mockImplementation(
      async (_token: string, _realmSlug: string, characterName: string) => {
        if (characterName === "Notfound") {
          throw new MockBlizzardApiRequestError("missing", 404);
        }

        if (characterName === "Locked") {
          return makeEncounterSummary(Date.parse("2026-05-21T10:00:00.000Z"));
        }

        return makeEncounterSummary(Date.parse("2026-05-13T03:00:00.000Z"));
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("checks clean and locked characters from full roster", async () => {
    const result = await checkRaidLockoutsForExport({
      difficultyID: 15,
      exportText: makeExport({
        name: "Leader",
        realm: "Draenor",
        classFile: "PALADIN",
        groupType: "raid",
        groupSize: "2",
        instanceType: "raid",
        instanceName: "The Voidspire",
        selectedRaidDifficultyID: "15",
        selectedRaidDifficultyName: "Heroic",
        roster:
          "Clean:Draenor:MAGE:DAMAGER,Locked:Ревущий фьорд:WARLOCK:DAMAGER",
      }),
    });

    expect(result.status).toBe("success");
    expect(result.rows).toMatchObject([
      {
        name: "Clean",
        status: "clean",
        killedBosses: [],
        avatarUrl: "https://render.worldofwarcraft.com/avatar.jpg",
        serverSlug: "draenor",
        serverRegion: "eu",
      },
      {
        name: "Locked",
        status: "locked",
        serverSlug: "howling-fjord",
        serverRegion: "eu",
        killedBosses: [
          {
            name: "Император Аверзиан",
            sourceName: "Imperator Averzian",
          },
        ],
      },
    ]);
    expect(blizzardApiMock.fetchCharacterRaidEncounters).toHaveBeenCalledWith(
      "app-token",
      "howling-fjord",
      "Locked",
      "eu",
    );
    expect(blizzardApiMock.fetchCharacterMedia).toHaveBeenCalledWith(
      "app-token",
      "draenor",
      "Clean",
      "eu",
    );
  });

  it("keeps lockout result when character media is unavailable", async () => {
    blizzardApiMock.fetchCharacterMedia.mockRejectedValue(new Error("media failed"));

    const result = await checkRaidLockoutsForExport({
      difficultyID: 15,
      exportText: makeExport({
        name: "Leader",
        realm: "Draenor",
        classFile: "PALADIN",
        groupType: "raid",
        groupSize: "1",
        instanceType: "raid",
        instanceName: "The Voidspire",
        selectedRaidDifficultyID: "15",
        selectedRaidDifficultyName: "Heroic",
        roster: "Clean:Draenor:MAGE:DAMAGER",
      }),
    });

    expect(result.status).toBe("success");
    expect(result.rows[0]).toMatchObject({
      name: "Clean",
      status: "clean",
      avatarUrl: null,
      serverSlug: "draenor",
      serverRegion: "eu",
    });
    expect(blizzardApiMock.fetchCharacterRaidEncounters).toHaveBeenCalledWith(
      "app-token",
      "draenor",
      "Clean",
      "eu",
    );
  });

  it("falls back to exporter when old imports do not include roster", async () => {
    const result = await checkRaidLockoutsForExport({
      exportText: makeExport({
        name: "Leader",
        realm: "Draenor",
        classFile: "PALADIN",
        groupType: "raid",
        groupSize: "20",
        instanceType: "raid",
        instanceName: "The Voidspire",
      }),
    });

    expect(result.status).toBe("success");
    expect(result.usedFallbackRoster).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: "Leader",
      status: "clean",
      serverSlug: "draenor",
      serverRegion: "eu",
    });
  });

  it("marks missing realms and missing characters as not found", async () => {
    const result = await checkRaidLockoutsForExport({
      exportText: makeExport({
        name: "Leader",
        realm: "Draenor",
        classFile: "PALADIN",
        groupType: "raid",
        groupSize: "2",
        instanceType: "raid",
        instanceName: "The Voidspire",
        roster:
          "NoRealm:Missing Realm:MAGE:DAMAGER,Notfound:Draenor:WARLOCK:DAMAGER",
      }),
    });

    expect(result.status).toBe("success");
    expect(result.rows).toMatchObject([
      {
        name: "NoRealm",
        status: "not_found",
        serverSlug: null,
        serverRegion: "eu",
      },
      {
        name: "Notfound",
        status: "not_found",
        serverSlug: "draenor",
        serverRegion: "eu",
      },
    ]);
  });

  it("checks legacy RR1 roster members with normalized Cyrillic realm names", async () => {
    blizzardApiMock.resolveRealmSlug.mockImplementation(
      async (_token: string, realm: string) =>
        realm.replace(/\s/gu, "") === "Ревущийфьорд" ? "howling-fjord" : null,
    );

    const result = await checkRaidLockoutsForExport({
      difficultyID: 15,
      raidSlug: "the-voidspire",
      exportText: makeExport({
        name: "Leader",
        realm: "Ревущий фьорд",
        classFile: "DEATHKNIGHT",
        groupType: "party",
        groupSize: "2",
        instanceType: "raid",
        instanceName: "The Voidspire",
        selectedRaidDifficultyID: "15",
        roster:
          "NoSpace:Ревущийфьорд:DEATHKNIGHT:TANK,WithSpace:Ревущий фьорд:SHAMAN:DAMAGER",
      }),
    });

    expect(result.status).toBe("success");
    expect(result.rows).toMatchObject([
      {
        name: "NoSpace",
        realm: "Ревущийфьорд",
        status: "clean",
        serverSlug: "howling-fjord",
        serverRegion: "eu",
      },
      {
        name: "WithSpace",
        realm: "Ревущий фьорд",
        status: "clean",
        serverSlug: "howling-fjord",
        serverRegion: "eu",
      },
    ]);
    expect(blizzardApiMock.resolveRealmSlug).not.toHaveBeenCalled();
    expect(blizzardApiMock.fetchCharacterRaidEncounters).toHaveBeenCalledWith(
      "app-token",
      "howling-fjord",
      "NoSpace",
      "eu",
    );
  });

  it("checks legacy RR1 roster members with compact connected realm names", async () => {
    const result = await checkRaidLockoutsForExport({
      difficultyID: 15,
      raidSlug: "the-voidspire",
      exportText: makeExport({
        name: "Leader",
        realm: "Draenor",
        classFile: "DEMONHUNTER",
        groupType: "party",
        groupSize: "1",
        instanceType: "raid",
        instanceName: "The Voidspire",
        selectedRaidDifficultyID: "15",
        roster: "Avayn:TarrenMill:DEMONHUNTER:DAMAGER",
      }),
    });

    expect(result.status).toBe("success");
    expect(result.rows[0]).toMatchObject({
      name: "Avayn",
      realm: "TarrenMill",
      status: "clean",
      serverSlug: "tarren-mill",
      serverRegion: "eu",
    });
    expect(blizzardApiMock.resolveRealmSlug).not.toHaveBeenCalled();
    expect(blizzardApiMock.fetchCharacterRaidEncounters).toHaveBeenCalledWith(
      "app-token",
      "tarren-mill",
      "Avayn",
      "eu",
    );
  });

  it("keeps existing characters visible when Blizzard lockout API returns 404", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ name: "Avayn", realm: "Tarren Mill" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    blizzardApiMock.fetchCharacterRaidEncounters.mockImplementationOnce(
      async () => {
        throw new MockBlizzardApiRequestError("missing", 404);
      },
    );

    const result = await checkRaidLockoutsForExport({
      difficultyID: 15,
      raidSlug: "the-voidspire",
      exportText: makeExport({
        name: "Leader",
        realm: "Draenor",
        classFile: "DEMONHUNTER",
        groupType: "party",
        groupSize: "1",
        instanceType: "raid",
        instanceName: "The Voidspire",
        selectedRaidDifficultyID: "15",
        roster: "Avayn:TarrenMill:DEMONHUNTER:DAMAGER",
      }),
    });

    expect(result.status).toBe("success");
    expect(result.rows[0]).toMatchObject({
      name: "Avayn",
      realm: "TarrenMill",
      status: "error",
      error:
        "Персонаж существует, но Blizzard API не отдаёт данные о рейдовых сохранениях.",
      serverSlug: "tarren-mill",
      serverRegion: "eu",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining("realm=tarren-mill"),
      }),
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("uses a manually selected current raid when the import is not a raid", async () => {
    const result = await checkRaidLockoutsForExport({
      difficultyID: 15,
      raidSlug: "the-voidspire",
      exportText: makeExport({
        name: "Leader",
        realm: "Draenor",
        classFile: "PALADIN",
        groupType: "party",
        groupSize: "2",
        instanceType: "party",
        instanceName: "Not a raid",
        roster:
          "Clean:Draenor:MAGE:DAMAGER,Locked:Ревущий фьорд:WARLOCK:DAMAGER",
      }),
    });

    expect(result.status).toBe("success");
    expect(result.raidName).toBe("Шпиль Бездны");
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Строка сделана не в рейде"),
        expect.stringContaining("Рейд выбран вручную"),
      ]),
    );
    expect(result.rows).toMatchObject([
      {
        name: "Clean",
        status: "clean",
      },
      {
        name: "Locked",
        status: "locked",
      },
    ]);
  });

  it("checks every current season raid with one encounter request per character", async () => {
    blizzardApiMock.fetchCharacterRaidEncounters.mockImplementation(
      async (_token: string, _realmSlug: string, characterName: string) => {
        if (characterName === "Locked") {
          return makeSeasonEncounterSummary();
        }

        return makeEncounterSummary(Date.parse("2026-05-13T03:00:00.000Z"));
      },
    );

    const result = await checkRaidLockoutsForExport({
      difficultyID: 15,
      raidSlug: ALL_SEASON_RAIDS_VALUE,
      exportText: makeExport({
        name: "Leader",
        realm: "Draenor",
        classFile: "PALADIN",
        groupType: "raid",
        groupSize: "2",
        instanceType: "raid",
        instanceName: "The Voidspire",
        roster:
          "Clean:Draenor:MAGE:DAMAGER,Locked:Ревущий фьорд:WARLOCK:DAMAGER",
      }),
    });

    expect(result.status).toBe("success");
    expect(result.raidName).toBe("Все рейды сезона");
    expect(result.rows).toHaveLength(2);
    expect(result.rows.find((row) => row.name === "Clean")).toMatchObject({
      status: "clean",
      killedBosses: [],
    });
    expect(result.rows.find((row) => row.name === "Locked")).toMatchObject({
      status: "locked",
      killedBosses: [
        {
          raidSlug: "the-dreamrift",
          raidName: "Провал снов",
          sourceName: "Dreamrift Sentinel",
        },
        {
          raidSlug: "the-voidspire",
          raidName: "Шпиль Бездны",
          sourceName: "Imperator Averzian",
        },
        {
          raidSlug: "sporefall",
          raidName: "Споропад",
          sourceName: "Rotmire",
        },
      ],
    });
    expect(blizzardApiMock.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(2);
  });

  it("uses RR2 realm slugs directly without resolving legacy realm names", async () => {
    const draenor = realmCode("eu", "draenor");
    const howlingFjord = realmCode("eu", "howling-fjord");
    const result = await checkRaidLockoutsForExport({
      difficultyID: 15,
      exportText: makeRr2Export({
        rg: "e",
        n: "Leader",
        r: draenor,
        c: "P",
        g: "r",
        z: "2",
        t: "r",
        in: "The Voidspire",
        sr: "15",
        ro: `Clean:${draenor}:M:D,Locked:${howlingFjord}:WL:D`,
      }),
    });

    expect(result.status).toBe("success");
    expect(result.rows).toMatchObject([
      {
        name: "Clean",
        realm: "Draenor",
        serverSlug: "draenor",
        serverRegion: "eu",
      },
      {
        name: "Locked",
        realm: "Howling Fjord",
        serverSlug: "howling-fjord",
        serverRegion: "eu",
        status: "locked",
      },
    ]);
    expect(blizzardApiMock.getApplicationAccessToken).toHaveBeenCalledWith("eu");
    expect(blizzardApiMock.resolveRealmSlug).not.toHaveBeenCalled();
    expect(blizzardApiMock.fetchCharacterRaidEncounters).toHaveBeenCalledWith(
      "app-token",
      "howling-fjord",
      "Locked",
      "eu",
    );
  });

  it("labels imported RR2 flex difficulty with the request locale", async () => {
    const draenor = realmCode("eu", "draenor");
    const result = await checkRaidLockoutsForExport({
      locale: "en",
      exportText: makeRr2Export({
        rg: "e",
        n: "Leader",
        r: draenor,
        c: "P",
        g: "r",
        z: "1",
        t: "r",
        in: "Sporefall",
        di: "233",
        sr: "233",
        ro: `Clean:${draenor}:M:D`,
      }),
    });

    expect(result.status).toBe("success");
    expect(result.defaultDifficultyID).toBe(233);
    expect(result.difficulty).toEqual({
      id: 233,
      label: "Flex",
      type: "MYTHIC",
    });
    expect(result.difficultyOptions.find((difficulty) => difficulty.id === 233)).toEqual({
      id: 233,
      label: "Flex",
      type: "MYTHIC",
    });
  });

  it("checks US RR2 exports against US Blizzard endpoints", async () => {
    const draenor = realmCode("us", "draenor");
    const result = await checkRaidLockoutsForExport({
      difficultyID: 15,
      exportText: makeRr2Export({
        rg: "u",
        n: "Leader",
        r: draenor,
        c: "P",
        g: "r",
        z: "1",
        t: "r",
        in: "The Voidspire",
        ro: `Clean:${draenor}:M:D`,
      }),
    });

    expect(result.status).toBe("success");
    expect(result.rows[0]).toMatchObject({
      name: "Clean",
      serverSlug: "draenor",
      serverRegion: "us",
    });
    expect(blizzardApiMock.getApplicationAccessToken).toHaveBeenCalledWith("us");
    expect(blizzardApiMock.resolveRealmSlug).not.toHaveBeenCalled();
    expect(blizzardApiMock.fetchCharacterRaidEncounters).toHaveBeenCalledWith(
      "app-token",
      "draenor",
      "Clean",
      "us",
    );
  });

  it("rejects an unknown manual raid slug", async () => {
    const result = await checkRaidLockoutsForExport({
      raidSlug: "not-current",
      exportText: makeExport({
        name: "Leader",
        realm: "Draenor",
        classFile: "PALADIN",
        groupType: "raid",
        groupSize: "20",
        instanceType: "raid",
        instanceName: "The Voidspire",
      }),
    });

    expect(result.status).toBe("error");
    expect(result.message).toBe("Выбранный рейд не найден в актуальном каталоге.");
  });
});
