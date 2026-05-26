import { ADDON_EXPORT_PREFIX } from "@/lib/addon-export";
import type { BlizzardCharacterRaidEncounters } from "@/lib/blizzard-api";
import { ALL_SEASON_RAIDS_VALUE } from "@/lib/raid-check-core";

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
  fetchCharacterRaidEncounters: blizzardApiMock.fetchCharacterRaidEncounters,
  getApplicationAccessToken: blizzardApiMock.getApplicationAccessToken,
  resolveRealmSlug: blizzardApiMock.resolveRealmSlug,
}));

import { checkRaidLockoutsForExport } from "@/lib/raid-check";

function makeExport(params: Record<string, string>) {
  return `${ADDON_EXPORT_PREFIX}${new URLSearchParams(params).toString()}`;
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
        ],
      },
    ],
  };
}

describe("raid check", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T12:00:00.000Z"));
    blizzardApiMock.getApplicationAccessToken.mockResolvedValue("app-token");
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
      },
      {
        name: "Locked",
        status: "locked",
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
      },
      {
        name: "Notfound",
        status: "not_found",
      },
    ]);
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
      ],
    });
    expect(blizzardApiMock.fetchCharacterRaidEncounters).toHaveBeenCalledTimes(2);
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
