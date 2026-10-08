import {
  calculateRaidForecast,
  getRaidForecastLockout,
  isForecastWeekCurrent,
  type RaidForecastSnapshot,
} from "@/lib/raid-forecast-core";
import type { BlizzardCharacterRaidEncounters, BlizzardRaidEncounterInstance } from "@/lib/blizzard-api";

function instance(timestamp?: number, difficulty = "HEROIC", raidId = 1320, bossId = 2888): BlizzardRaidEncounterInstance {
  return {
    instance: { id: raidId, name: "An arbitrary localized name" },
    modes: [{ difficulty: { type: difficulty }, progress: {
      encounters: [{ encounter: { id: bossId }, last_kill_timestamp: timestamp }],
    } }],
  };
}
const now = new Date("2026-10-02T12:00:00+03:00");
const currentKill = Date.parse("2026-09-30T10:00:00Z");
const oldKill = Date.parse("2026-09-29T10:00:00Z");
const response = (...instances: BlizzardRaidEncounterInstance[]): BlizzardCharacterRaidEncounters => ({ expansions: [{ instances }] });

describe("raid forecast", () => {
  it.each([
    ["09:59:59", 1], ["10:00:00", 90], ["16:59:59", 90], ["17:00:00", 90],
    ["17:30:00", 75], ["18:00:00", 60], ["18:30:00", 46], ["19:00:00", 31],
    ["19:30:00", 16], ["19:59:59", 1], ["20:00:00", 1], ["23:59:59", 1],
  ])("calculates the Moscow boundary %s as %i%%", (time, chance) => {
    expect(calculateRaidForecast([{ status: "clean" }], new Date(`2026-10-02T${time}+03:00`)).chance).toBe(chance);
  });

  it("uses the same instant regardless of the input timezone", () => {
    const characters = [{ status: "clean" as const }];
    const utc = calculateRaidForecast(characters, new Date("2026-10-02T15:00:00Z"));
    expect(utc.chance).toBe(60);
    expect(calculateRaidForecast(characters, new Date("2026-10-02T08:00:00-07:00"))).toEqual(utc);
  });

  it("needs only one free character and never lowers the chance for partial API failures", () => {
    expect(calculateRaidForecast([{ status: "clean" }, { status: "unknown" }, { status: "locked" }], now)).toMatchObject({
      chance: 90, freeCount: 1, unknownCount: 1, lockedCount: 1,
    });
    expect(calculateRaidForecast(Array.from({ length: 10 }, () => ({ status: "clean" })), now).chance).toBe(90);
  });

  it("distinguishes all locked from unavailable characters", () => {
    expect(calculateRaidForecast([{ status: "locked" }], now)).toMatchObject({ chance: 1, reason: "all_locked" });
    expect(calculateRaidForecast([{ status: "locked" }, { status: "unknown" }], now).chance).toBeNull();
    expect(calculateRaidForecast([], now).chance).toBeNull();
    expect(calculateRaidForecast([{ status: "unknown" }], new Date("2026-10-02T19:59:59+03:00"))).toMatchObject({ chance: null, reason: "unknown" });
    expect(calculateRaidForecast([{ status: "unknown" }], new Date("2026-10-02T20:00:00+03:00"))).toMatchObject({ chance: 1, reason: "outside_hours" });
  });

  it("keeps heroic and mythic Nek'zali lockouts independent", () => {
    const data = response(instance(currentKill), instance(oldKill, "MYTHIC", 1320, 2888));
    expect(getRaidForecastLockout(data, "heroic", now)).toEqual({ status: "locked", lastKillAt: new Date(currentKill).toISOString() });
    expect(getRaidForecastLockout(data, "mythic", now)).toEqual({ status: "clean", lastKillAt: new Date(oldKill).toISOString() });
  });

  it("ignores the former heroic target when Nek'zali has no current-week kill", () => {
    const data = response(instance(currentKill, "HEROIC", 1317, 2849), instance(oldKill));
    expect(getRaidForecastLockout(data, "heroic", now)).toEqual({ status: "clean", lastKillAt: new Date(oldKill).toISOString() });
  });

  it("expires a snapshot at the weekly reset", () => {
    const snapshot = { resetStart: "2026-09-23T04:00:00.000Z" } as RaidForecastSnapshot;
    expect(isForecastWeekCurrent(snapshot, new Date("2026-09-30T03:59:59Z"))).toBe(true);
    expect(isForecastWeekCurrent(snapshot, new Date("2026-09-30T04:00:00Z"))).toBe(false);
  });
});

describe.each([
  { difficulty: "heroic" as const, difficultyType: "HEROIC", raidId: 1320, bossId: 2888 },
  { difficulty: "mythic" as const, difficultyType: "MYTHIC", raidId: 1320, bossId: 2888 },
])("$difficulty forecast lockouts", ({ difficulty, difficultyType, raidId, bossId }) => {
  const target = (timestamp?: number) => instance(timestamp, difficultyType, raidId, bossId);
  const check = (data: BlizzardCharacterRaidEncounters, time = now) => getRaidForecastLockout(data, difficulty, time);

  it("finds the latest target kill across duplicate entries regardless of localized names", () => {
    const data = { expansions: [{ instances: [target(oldKill)] }, { instances: [target(currentKill), target(oldKill)] }] };
    expect(check(data)).toEqual({ status: "locked", lastKillAt: new Date(currentKill).toISOString() });
  });

  it("ignores other difficulties, bosses, raids and past-week kills", () => {
    expect(check(response(
      instance(currentKill, "NORMAL", raidId, bossId),
      instance(currentKill, difficultyType === "HEROIC" ? "MYTHIC" : "HEROIC", raidId, bossId),
      instance(currentKill, difficultyType, 9999, bossId),
      instance(currentKill, difficultyType, raidId, 9999),
      target(oldKill),
    ))).toEqual({ status: "clean", lastKillAt: new Date(oldKill).toISOString() });
  });

  it("handles the exact EU reset boundary and the alternate encounter layout", () => {
    const reset = new Date("2026-09-30T04:00:00Z");
    expect(check(response(target(oldKill)), new Date(reset.getTime() - 1)).status).toBe("locked");
    expect(check(response(target(oldKill)), reset).status).toBe("clean");
    const data = response({ instance: { id: raidId }, modes: [{ difficulty: { type: difficultyType }, encounters: [{ encounter: { id: bossId }, last_kill_timestamp: reset.getTime() }] }] });
    expect(check(data, reset).status).toBe("locked");
  });

  it("treats a successful empty history as free, but rejects malformed history", () => {
    expect(check({ expansions: [] })).toEqual({ status: "clean", lastKillAt: null });
    expect(check(response(target())).status).toBe("clean");
    expect(() => check(null as unknown as BlizzardCharacterRaidEncounters)).toThrow();
    expect(() => check({ expansions: {} } as BlizzardCharacterRaidEncounters)).toThrow();
  });

  it.each([NaN, Infinity, -1, now.getTime() + 1000])("rejects an invalid kill timestamp: %s", (timestamp) => {
    expect(() => check(response(target(timestamp)))).toThrow();
  });

  it("rejects a completed encounter with no kill timestamp", () => {
    const data = response({ instance: { id: raidId }, modes: [{ difficulty: { type: difficultyType }, encounters: [{ encounter: { id: bossId }, completed_count: 1 }] }] });
    expect(() => check(data)).toThrow();
  });
});
