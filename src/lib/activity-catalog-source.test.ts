import {
  currentSeasonGroupDefinition,
  eventSeasonDefinitions,
  midnightSeasonOneDungeonSlugs,
  midnightSeasonOneRaidSlugs,
  midnightSeasonTwoDungeonSlugs,
  midnightSeasonTwoRaidSlugs,
} from "@/lib/activity-catalog-source";

describe("activity catalog source", () => {
  it("treats Midnight Season 2 as the current season", () => {
    expect(currentSeasonGroupDefinition).toEqual({
      slug: "midnight-season-2",
      nameEn: "Season 2 · Midnight",
      nameRu: "Сезон 2 · Midnight",
      sortOrder: 0,
    });
    expect(eventSeasonDefinitions.map((season) => season.slug)).toEqual([
      "midnight-season-2",
      "midnight-season-1",
    ]);
  });

  it("keeps the four launch raids in Midnight Season 1", () => {
    expect(midnightSeasonOneRaidSlugs).toEqual([
      "march-on-queldanas",
      "the-dreamrift",
      "the-voidspire",
      "sporefall",
    ]);
  });

  it("keeps the original dungeon rotation in Midnight Season 1", () => {
    expect(midnightSeasonOneDungeonSlugs).toEqual([
      "magisters-terrace",
      "maisara-caverns",
      "nexus-point-xenas",
      "windrunner-spire",
      "algethar-academy",
      "seat-of-the-triumvirate",
      "skyreach",
      "pit-of-saron",
    ]);
  });

  it("keeps the official dungeon and raid rotation in Midnight Season 2", () => {
    expect(midnightSeasonTwoDungeonSlugs).toEqual([
      "altar-of-fangs",
      "murder-row",
      "den-of-nalorakk",
      "blinding-vale",
      "voidscar-arena",
      "ruby-life-pools",
      "kings-rest",
      "temple-of-sethraliss",
    ]);
    expect(midnightSeasonTwoRaidSlugs).toEqual([
      "venomous-abyss",
      "tidebound-grotto",
    ]);
  });
});
