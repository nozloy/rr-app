import { buildEventCatalogFromRecords } from "@/lib/activity-catalog";
import type {
  CatalogDifficultyRecord,
  CatalogGroupRecord,
} from "@/lib/activity-catalog";

function activity(
  slug: string,
  kind: "RAID" | "DUNGEON" | "OPEN_WORLD",
  sortOrder: number,
  isActive = true,
  difficultyOptions: CatalogDifficultyRecord[] = [],
) {
  return {
    artPath: `/${kind.toLowerCase()}/${slug}.jpg`,
    difficultyOptions: difficultyOptions.map((difficulty, index) => ({
      difficulty,
      sortOrder: index,
    })),
    isActive,
    kind,
    nameEn: `${slug} en`,
    nameRu: `${slug} ru`,
    shortNameEn: slug.toUpperCase(),
    shortNameRu: slug.toUpperCase(),
    slug,
    sortOrder,
  };
}

const difficulties: CatalogDifficultyRecord[] = [
  {
    isActive: true,
    labelEn: "Normal",
    labelRu: "Нормал",
    slug: "normal",
    sortOrder: 0,
  },
  {
    isActive: true,
    labelEn: "Heroic",
    labelRu: "Героик",
    slug: "heroic",
    sortOrder: 1,
  },
  {
    isActive: true,
    labelEn: "Mythic",
    labelRu: "Мифик",
    slug: "mythic",
    sortOrder: 2,
  },
  {
    isActive: true,
    labelEn: "Flexible Mythic",
    labelRu: "Гибкий Мифический",
    slug: "flex-mythic",
    sortOrder: 3,
  },
];

describe("activity catalog", () => {
  it("builds event options from active DB records in group order", () => {
    const expansionGroups: CatalogGroupRecord[] = [
      {
        isActive: true,
        items: [
          {
            activity: activity("second-raid", "RAID", 1, true, [
              difficulties[1],
              difficulties[3],
            ]),
            sortOrder: 1,
          },
          { activity: activity("first-raid", "RAID", 0), sortOrder: 0 },
          { activity: activity("inactive-raid", "RAID", 2, false), sortOrder: 2 },
          {
            activity: { ...activity("farm", "OPEN_WORLD", 0), artPath: "" },
            sortOrder: 3,
          },
        ],
        kind: "EXPANSION",
        nameEn: "Midnight",
        nameRu: "Midnight",
        slug: "midnight",
        sortOrder: 0,
      },
      {
        isActive: true,
        items: [],
        kind: "EXPANSION",
        nameEn: "The War Within",
        nameRu: "The War Within",
        slug: "the-war-within",
        sortOrder: 1,
      },
    ];
    const seasonGroups: CatalogGroupRecord[] = [
      {
        isActive: true,
        items: [
          {
            activity: activity("season-two-dungeon", "DUNGEON", 0),
            sortOrder: 0,
          },
          {
            activity: activity("season-two-raid", "RAID", 0),
            sortOrder: 1,
          },
        ],
        kind: "SEASON",
        nameEn: "Season 2 · Midnight",
        nameRu: "Сезон 2 · Midnight",
        slug: "midnight-season-2",
        sortOrder: 1,
      },
      {
        isActive: true,
        items: [
          { activity: activity("season-one-raid", "RAID", 0), sortOrder: 0 },
          { activity: activity("season-dungeon", "DUNGEON", 0), sortOrder: 0 },
        ],
        kind: "SEASON",
        nameEn: "Season 1 · Midnight",
        nameRu: "Сезон 1 · Midnight",
        slug: "midnight-season-1",
        sortOrder: 0,
      },
    ];

    const catalog = buildEventCatalogFromRecords(
      { difficulties, expansionGroups, seasonGroups },
      "ru",
    );

    expect(catalog.addons).toEqual([
      { label: "Midnight", value: "midnight" },
      { label: "The War Within", value: "the-war-within" },
    ]);
    expect(catalog.defaultAddon).toBe("midnight");
    expect(catalog.defaultContentScope).toBe("midnight-season-2");
    expect(catalog.contentScopes).toEqual([
      { label: "Сезон 2", value: "midnight-season-2" },
      { label: "Сезон 1", value: "midnight-season-1" },
      { label: "Все", value: "expansion" },
    ]);
    expect(catalog.difficulties.map((option) => option.label)).toEqual([
      "Нормал",
      "Героик",
      "Мифик",
    ]);
    expect(
      catalog.optionsByAddon.midnight.expansion.raid.map((option) => option.slug),
    ).toEqual(["first-raid", "second-raid"]);
    expect(catalog.optionsByAddon.midnight.expansion["open-world"][0]).toMatchObject({
      activityType: "open-world",
      artPath: "/home/raid-reminder-mark.png",
      name: "farm ru",
    });
    expect(
      catalog.optionsByAddon.midnight["midnight-season-2"].dungeon.map(
        (option) => option.slug,
      ),
    ).toEqual(["season-two-dungeon"]);
    expect(
      catalog.optionsByAddon.midnight["midnight-season-2"].raid.map(
        (option) => option.slug,
      ),
    ).toEqual(["season-two-raid"]);
    expect(
      catalog.optionsByAddon.midnight["midnight-season-1"].dungeon[0],
    ).toMatchObject({
      activityType: "dungeon",
      slug: "season-dungeon",
      tag: "ПОДЗЕМЕЛЬЕ",
    });
    expect(
      catalog.optionsByAddon.midnight["midnight-season-1"].raid.map(
        (option) => option.slug,
      ),
    ).toEqual(["season-one-raid"]);
    expect(catalog.optionsByAddon["the-war-within"]).toEqual({
      expansion: {
        dungeon: [],
        "open-world": [],
        raid: [],
      },
    });
    expect(
      catalog.difficultiesByActivitySlug["first-raid"].map(
        (option) => option.difficulty,
      ),
    ).toEqual(["normal", "heroic", "mythic"]);
    expect(
      catalog.difficultiesByActivitySlug["second-raid"].map(
        (option) => option.label,
      ),
    ).toEqual(["Героик", "Гибкий Мифический"]);
  });

  it("keeps inactive groups out of the form catalog", () => {
    const catalog = buildEventCatalogFromRecords(
      {
        difficulties,
        expansionGroups: [
          {
            isActive: false,
            items: [{ activity: activity("legacy-raid", "RAID", 0), sortOrder: 0 }],
            kind: "EXPANSION",
            nameEn: "Legacy",
            nameRu: "Legacy",
            slug: "legacy",
            sortOrder: 0,
          },
        ],
        seasonGroups: [],
      },
      "en",
    );

    expect(catalog.addons).toEqual([]);
    expect(catalog.defaultContentScope).toBe("expansion");
    expect(catalog.contentScopes).toEqual([
      { label: "All", value: "expansion" },
    ]);
    expect(catalog.optionsByAddon).toEqual({});
    expect(catalog.difficultiesByActivitySlug).toEqual({});
  });
});
