import {
  buildWarcraftLogsRaidStats,
  getWarcraftLogsSummary,
  isWarcraftLogsCacheFresh,
  normalizeWarcraftLogsGear,
  trimEnvSecret,
} from "@/lib/warcraftlogs-core";

describe("warcraftlogs core", () => {
  it("trims quoted env values", () => {
    expect(trimEnvSecret('"client-id"')).toBe("client-id");
    expect(trimEnvSecret("'client-secret'")).toBe("client-secret");
  });

  it("normalizes heroic and mythic ranking payloads", () => {
    const stats = buildWarcraftLogsRaidStats({
      zoneId: 46,
      zoneName: "VS / DR / MQD",
      heroicPayload: {
        bestPerformanceAverage: 82.25,
        rankings: [
          {
            encounter: { name: "Imperator Averzian" },
            rankPercent: 95.14,
            bestAmount: 123456,
            totalKills: 3,
            rank: 123,
            spec: { name: "Fire" },
          },
          {
            encounter: { name: "Dreamrift Sentinel" },
            rankPercent: 70,
          },
        ],
      },
      mythicPayload: {
        rankings: [
          {
            encounter: { name: "Mythic Boss" },
            rankPercent: 67.45,
          },
        ],
      },
    });
    const summary = getWarcraftLogsSummary(stats);

    expect(stats.heroic).toMatchObject({
      averageParse: 82.3,
      bestParse: 95.1,
      encounters: [
        {
          name: "Imperator Averzian",
          parse: 95.1,
          totalKills: 3,
          spec: "Fire",
        },
        {
          name: "Dreamrift Sentinel",
          parse: 70,
        },
      ],
    });
    expect(stats.mythic).toMatchObject({
      averageParse: 67.5,
      bestParse: 67.5,
    });
    expect(summary).toEqual({
      averageParse: 74.9,
      bestParse: 95.1,
    });
  });

  it("handles unknown ranking shapes without crashing", () => {
    const stats = buildWarcraftLogsRaidStats({
      zoneId: 46,
      zoneName: "VS / DR / MQD",
      heroicPayload: { unexpected: { nested: true } },
      mythicPayload: null,
    });

    expect(stats.heroic).toMatchObject({
      averageParse: null,
      bestParse: null,
      encounters: [],
    });
    expect(stats.mythic).toBeNull();
  });

  it("normalizes gear snapshots", () => {
    const gear = normalizeWarcraftLogsGear({
      averageItemLevel: 710.4,
      gear: [
        {
          id: 1,
          name: "Arcane Blade",
          slot: "Main Hand",
          itemLevel: 720,
          quality: "epic",
        },
      ],
    });

    expect(gear).toEqual({
      itemLevel: 710,
      items: [
        {
          id: 1,
          name: "Arcane Blade",
          slot: "Main Hand",
          itemLevel: 720,
          quality: "epic",
          icon: null,
        },
      ],
    });
  });

  it("checks cache freshness with a 24 hour ttl", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");

    expect(
      isWarcraftLogsCacheFresh("2026-06-14T13:00:00.000Z", now),
    ).toBe(true);
    expect(
      isWarcraftLogsCacheFresh("2026-06-14T11:00:00.000Z", now),
    ).toBe(false);
  });
});
