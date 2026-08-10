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
    ];
    const seasonGroups: CatalogGroupRecord[] = [
      {
        isActive: true,
        items: [
          { activity: activity("season-dungeon", "DUNGEON", 0), sortOrder: 0 },
        ],
        kind: "SEASON",
        nameEn: "Current season",
        nameRu: "Текущий сезон",
        slug: "current-season",
        sortOrder: 0,
      },
    ];

    const catalog = buildEventCatalogFromRecords(
      { difficulties, expansionGroups, seasonGroups },
      "ru",
    );

    expect(catalog.addons).toEqual([{ label: "Midnight", value: "midnight" }]);
    expect(catalog.defaultAddon).toBe("midnight");
    expect(catalog.difficulties.map((option) => option.label)).toEqual([
      "Нормал",
      "Героик",
      "Мифик",
    ]);
    expect(catalog.optionsByAddon.midnight.raid.map((option) => option.slug)).toEqual([
      "first-raid",
      "second-raid",
    ]);
    expect(catalog.optionsByAddon.midnight["open-world"][0]).toMatchObject({
      activityType: "open-world",
      artPath: "/home/raid-reminder-mark.png",
      name: "farm ru",
    });
    expect(catalog.optionsByAddon.midnight.season[0]).toMatchObject({
      activityType: "season",
      slug: "season-dungeon",
      tag: "ПОДЗЕМЕЛЬЕ",
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
    expect(catalog.optionsByAddon).toEqual({});
    expect(catalog.difficultiesByActivitySlug).toEqual({});
  });
});
