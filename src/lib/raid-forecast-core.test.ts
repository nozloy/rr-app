import {
  calculateRaidForecast,
  getHeroicNymrissaLockout,
  isForecastWeekCurrent,
  type RaidForecastSnapshot,
} from "@/lib/raid-forecast-core";
import type { BlizzardCharacterRaidEncounters, BlizzardRaidEncounterInstance } from "@/lib/blizzard-api";

function instance(timestamp?: number, difficulty = "HEROIC", raidId = 1317, bossId = 2849): BlizzardRaidEncounterInstance {
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

  it("finds heroic kills by raid and encounter IDs across all duplicate entries", () => {
    const data = { expansions: [{ instances: [instance(oldKill)] }, { instances: [instance(currentKill), instance(oldKill)] }] };
    expect(getHeroicNymrissaLockout(data, now)).toEqual({ status: "locked", lastKillAt: new Date(currentKill).toISOString() });
  });

  it("ignores other difficulties, bosses, raids and past-week kills", () => {
    expect(getHeroicNymrissaLockout(response(
      instance(currentKill, "NORMAL"), instance(currentKill, "MYTHIC"),
      instance(currentKill, "HEROIC", 9999), instance(currentKill, "HEROIC", 1317, 9999), instance(oldKill),
    ), now)).toEqual({ status: "clean", lastKillAt: new Date(oldKill).toISOString() });
  });

  it("handles the exact EU reset boundary and the alternate encounter layout", () => {
    const reset = new Date("2026-09-30T04:00:00Z");
    expect(getHeroicNymrissaLockout(response(instance(oldKill)), new Date(reset.getTime() - 1)).status).toBe("locked");
    expect(getHeroicNymrissaLockout(response(instance(oldKill)), reset).status).toBe("clean");
    const data = response({ instance: { id: 1317 }, modes: [{ difficulty: { type: "HEROIC" }, encounters: [{ encounter: { id: 2849 }, last_kill_timestamp: reset.getTime() }] }] });
    expect(getHeroicNymrissaLockout(data, reset).status).toBe("locked");
  });

  it("treats a successful empty history as free, but rejects malformed history", () => {
    expect(getHeroicNymrissaLockout({ expansions: [] }, now)).toEqual({ status: "clean", lastKillAt: null });
    expect(getHeroicNymrissaLockout(response(instance()), now).status).toBe("clean");
    expect(() => getHeroicNymrissaLockout(null as unknown as BlizzardCharacterRaidEncounters, now)).toThrow();
    expect(() => getHeroicNymrissaLockout(response(instance(now.getTime() + 1000)), now)).toThrow();
  });

  it("expires a snapshot at the weekly reset", () => {
    const snapshot = { resetStart: "2026-09-23T04:00:00.000Z" } as RaidForecastSnapshot;
    expect(isForecastWeekCurrent(snapshot, new Date("2026-09-30T03:59:59Z"))).toBe(true);
    expect(isForecastWeekCurrent(snapshot, new Date("2026-09-30T04:00:00Z"))).toBe(false);
  });
});
