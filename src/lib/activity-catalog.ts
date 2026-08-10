import { prisma } from "@/lib/prisma";
import type { AppLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { currentSeasonGroupDefinition } from "@/lib/activity-catalog-source";
import type {
  EventActivityType,
  EventCatalog,
  EventInstanceOption,
  DifficultyOption,
} from "@/components/events/create-event-types";

type CatalogActivityKind = "RAID" | "DUNGEON" | "OPEN_WORLD";
type CatalogGroupKind = "EXPANSION" | "SEASON";
const EVENT_CATALOG_FALLBACK_ART = "/home/raid-reminder-mark.png";
const standardDifficultySlugs = new Set(["normal", "heroic", "mythic"]);

export type CatalogActivityRecord = {
  slug: string;
  kind: CatalogActivityKind;
  nameRu: string;
  nameEn: string;
  shortNameRu: string;
  shortNameEn: string;
  artPath: string;
  isActive: boolean;
  sortOrder: number;
  difficultyOptions?: Array<{
    sortOrder: number;
    difficulty: CatalogDifficultyRecord;
  }>;
};

export type CatalogGroupRecord = {
  slug: string;
  kind: CatalogGroupKind;
  nameRu: string;
  nameEn: string;
  artPath?: string | null;
  isActive: boolean;
  sortOrder: number;
  items: Array<{
    sortOrder: number;
    activity: CatalogActivityRecord;
  }>;
};

export type CatalogDifficultyRecord = {
  slug: string;
  labelRu: string;
  labelEn: string;
  isActive: boolean;
  sortOrder: number;
};

type BuildEventCatalogInput = {
  difficulties: CatalogDifficultyRecord[];
  expansionGroups: CatalogGroupRecord[];
  seasonGroups: CatalogGroupRecord[];
};

const emptyOptionsByType: Record<EventActivityType, EventInstanceOption[]> = {
  dungeon: [],
  "open-world": [],
  raid: [],
};

function localizeName(
  locale: AppLocale,
  value: Pick<CatalogActivityRecord, "nameEn" | "nameRu">,
) {
  return locale === "ru" ? value.nameRu : value.nameEn;
}

function localizeShortName(
  locale: AppLocale,
  value: Pick<CatalogActivityRecord, "shortNameEn" | "shortNameRu">,
) {
  return locale === "ru" ? value.shortNameRu : value.shortNameEn;
}

function activityTypeForKind(kind: CatalogActivityKind): EventActivityType {
  if (kind === "RAID") {
    return "raid";
  }

  if (kind === "DUNGEON") {
    return "dungeon";
  }

  return "open-world";
}

function tagForActivityType(locale: AppLocale, activityType: EventActivityType) {
  if (activityType === "raid") {
    return t(locale, "events.typeRaid").toUpperCase();
  }

  if (activityType === "open-world") {
    return t(locale, "events.typeWorld").toUpperCase();
  }

  return t(locale, "events.typeDungeon").toUpperCase();
}

function toInstanceOption({
  activity,
  activityType,
  locale,
}: {
  activity: CatalogActivityRecord;
  activityType?: EventActivityType;
  locale: AppLocale;
}): EventInstanceOption {
  const resolvedActivityType = activityType ?? activityTypeForKind(activity.kind);

  return {
    activityType: resolvedActivityType,
    artPath: activity.artPath || EVENT_CATALOG_FALLBACK_ART,
    name: localizeName(locale, activity),
    shortName: localizeShortName(locale, activity),
    slug: activity.slug,
    tag: tagForActivityType(locale, resolvedActivityType),
  };
}

function getActiveSortedItems(group: CatalogGroupRecord) {
  return group.items
    .filter((item) => item.activity.isActive)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.activity.sortOrder - b.activity.sortOrder ||
        a.activity.nameEn.localeCompare(b.activity.nameEn),
    );
}

function cloneEmptyOptions() {
  return {
    dungeon: [...emptyOptionsByType.dungeon],
    "open-world": [...emptyOptionsByType["open-world"]],
    raid: [...emptyOptionsByType.raid],
  };
}

function toDifficultyOption(
  difficulty: CatalogDifficultyRecord,
  locale: AppLocale,
): DifficultyOption {
  return {
    difficulty: difficulty.slug,
    label: locale === "ru" ? difficulty.labelRu : difficulty.labelEn,
  };
}

function getActiveSortedDifficulties(difficulties: CatalogDifficultyRecord[]) {
  return difficulties
    .filter((difficulty) => difficulty.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
}

function getActivityDifficulties(
  activity: CatalogActivityRecord,
  fallbackDifficulties: DifficultyOption[],
  locale: AppLocale,
) {
  const options = activity.difficultyOptions
    ?.filter((item) => item.difficulty.isActive)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.difficulty.sortOrder - b.difficulty.sortOrder ||
        a.difficulty.slug.localeCompare(b.difficulty.slug),
    )
    .map((item) => toDifficultyOption(item.difficulty, locale));

  return options && options.length > 0 ? options : fallbackDifficulties;
}

export function buildEventCatalogFromRecords(
  input: BuildEventCatalogInput,
  locale: AppLocale,
): EventCatalog {
  const activeDifficulties = getActiveSortedDifficulties(input.difficulties);
  const standardDifficulties = activeDifficulties
    .filter((difficulty) => standardDifficultySlugs.has(difficulty.slug))
    .map((difficulty) => toDifficultyOption(difficulty, locale));
  const activeExpansionGroups = input.expansionGroups
    .filter((group) => group.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn));
  const activeSeasonGroups = input.seasonGroups
    .filter((group) => group.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn));
  const primarySeasonGroup =
    activeSeasonGroups.find(
      (group) => group.slug === currentSeasonGroupDefinition.slug,
    ) ?? activeSeasonGroups[0];
  const orderedSeasonGroups = primarySeasonGroup
    ? [
        primarySeasonGroup,
        ...activeSeasonGroups.filter(
          (group) => group.slug !== primarySeasonGroup.slug,
        ),
      ]
    : [];
  const seasonOptionsByScope: Record<
    string,
    Record<EventActivityType, EventInstanceOption[]>
  > = {};

  for (const seasonGroup of orderedSeasonGroups) {
    const options = cloneEmptyOptions();

    for (const item of getActiveSortedItems(seasonGroup)) {
      const activityType = activityTypeForKind(item.activity.kind);
      options[activityType].push(
        toInstanceOption({
          activity: item.activity,
          activityType,
          locale,
        }),
      );
    }

    seasonOptionsByScope[seasonGroup.slug] = options;
  }
  const optionsByAddon: EventCatalog["optionsByAddon"] = {};

  for (const group of activeExpansionGroups) {
    const expansionOptions = cloneEmptyOptions();

    for (const item of getActiveSortedItems(group)) {
      const activityType = activityTypeForKind(item.activity.kind);
      expansionOptions[activityType].push(
        toInstanceOption({
          activity: item.activity,
          activityType,
          locale,
        }),
      );
    }

    optionsByAddon[group.slug] = {
      expansion: expansionOptions,
      ...Object.fromEntries(
        Object.entries(seasonOptionsByScope)
          .filter(([scope]) => scope.startsWith(`${group.slug}-season-`))
          .map(([scope, options]) => [
            scope,
            {
              dungeon: [...options.dungeon],
              "open-world": [...options["open-world"]],
              raid: [...options.raid],
            },
          ]),
      ),
    };
  }

  const fallbackAddon = activeExpansionGroups[0]?.slug ?? "";
  const difficultiesByActivitySlug: EventCatalog["difficultiesByActivitySlug"] =
    {};

  for (const group of activeExpansionGroups) {
    for (const item of getActiveSortedItems(group)) {
      if (item.activity.kind === "RAID") {
        difficultiesByActivitySlug[item.activity.slug] = getActivityDifficulties(
          item.activity,
          standardDifficulties,
          locale,
        );
      }
    }
  }

  return {
    addons: activeExpansionGroups.map((group) => ({
      label: locale === "ru" ? group.nameRu : group.nameEn,
      value: group.slug,
    })),
    defaultAddon: activeExpansionGroups.find((group) => group.slug === "midnight")
      ?.slug ?? fallbackAddon,
    defaultContentScope: primarySeasonGroup?.slug ?? "expansion",
    contentScopes: [
      ...orderedSeasonGroups.map((group) => {
        const seasonNumber = /-season-(\d+)$/u.exec(group.slug)?.[1];

        return {
          label: seasonNumber
            ? `${t(locale, "events.scopeSeason")} ${seasonNumber}`
            : localizeName(locale, group),
          value: group.slug,
        };
      }),
      {
        label: t(locale, "events.scopeExpansion"),
        value: "expansion",
      },
    ],
    difficulties: standardDifficulties,
    difficultiesByActivitySlug,
    optionsByAddon,
  };
}

export async function getEventCatalog(locale: AppLocale): Promise<EventCatalog> {
  const [expansionGroups, seasonGroups, difficulties] = await Promise.all([
    prisma.activityGroup.findMany({
      where: { kind: "EXPANSION" },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }],
          include: {
            activity: {
              include: {
                difficultyOptions: {
                  include: { difficulty: true },
                  orderBy: [{ sortOrder: "asc" }],
                },
              },
            },
          },
        },
      },
    }),
    prisma.activityGroup.findMany({
      where: { kind: "SEASON" },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }],
          include: {
            activity: {
              include: {
                difficultyOptions: {
                  include: { difficulty: true },
                  orderBy: [{ sortOrder: "asc" }],
                },
              },
            },
          },
        },
      },
    }),
    prisma.eventDifficultyOption.findMany({
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    }),
  ]);

  return buildEventCatalogFromRecords(
    {
      difficulties,
      expansionGroups,
      seasonGroups,
    },
    locale,
  );
}
