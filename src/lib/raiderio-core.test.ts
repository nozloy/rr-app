import {
  isRaiderIoCacheFresh,
  normalizeRaiderIoProfile,
} from "@/lib/raiderio-core";
import { describe, expect, it } from "vitest";

describe("raiderio core", () => {
  it("normalizes score, ranks, runs, and raid progression", () => {
    const result = normalizeRaiderIoProfile({
      name: "Mahita",
      class: "Druid",
      active_spec_name: "Balance",
      active_spec_role: "healer",
      thumbnail_url: "https://example.com/avatar.jpg",
      profile_url: "https://raider.io/characters/eu/hyjal/Mahita",
      last_crawled_at: "2026-06-17T03:26:33.000Z",
      mythic_plus_scores_by_season: [
        {
          scores: { all: 3248.18 },
          segments: { all: { score: 3248.18, color: "#884ee9" } },
        },
      ],
      mythic_plus_ranks: {
        overall: { world: 5000, region: 1200, realm: 50 },
        class: { world: 600, region: 90, realm: 5 },
      },
      mythic_plus_best_runs: [
        {
          dungeon: "Windrunner Spire",
          short_name: "WS",
          mythic_level: 15,
          score: 413.24,
          num_keystone_upgrades: 1,
          completed_at: "2026-06-15T22:11:14.000Z",
          url: "https://raider.io/run",
        },
      ],
      raid_progression: {
        "tier-mn-1": {
          summary: "4/9 M",
          total_bosses: 9,
          normal_bosses_killed: 9,
          heroic_bosses_killed: 8,
          mythic_bosses_killed: 4,
        },
      },
    });

    expect(result).toMatchObject({
      name: "Mahita",
      className: "Druid",
      activeSpecName: "Balance",
      score: 3248.2,
      scoreColor: "#884ee9",
      overallRank: { region: 1200 },
      classRank: { realm: 5 },
      bestRuns: [{ dungeon: "Windrunner Spire", score: 413.2 }],
      raidProgression: [{ slug: "tier-mn-1", summary: "4/9 M" }],
    });
  });

  it("checks cache freshness with a 24 hour ttl", () => {
    const now = new Date("2026-06-17T12:00:00.000Z");

    expect(isRaiderIoCacheFresh("2026-06-17T11:30:00.000Z", now)).toBe(true);
    expect(isRaiderIoCacheFresh("2026-06-15T11:30:00.000Z", now)).toBe(false);
    expect(isRaiderIoCacheFresh(null, now)).toBe(false);
  });
});
