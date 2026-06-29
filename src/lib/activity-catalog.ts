import { prisma } from "@/lib/prisma";
import type { AppLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type {
  EventActivityType,
  EventCatalog,
  EventDifficulty,
  EventInstanceOption,
} from "@/components/events/create-event-types";

type CatalogActivityKind = "RAID" | "DUNGEON" | "OPEN_WORLD";
type CatalogGroupKind = "EXPANSION" | "SEASON";

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
};

export type CatalogGroupRecord = {
  slug: string;
  kind: CatalogGroupKind;
  nameRu: string;
  nameEn: string;
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
  season: [],
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
    artPath: activity.artPath,
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
    season: [...emptyOptionsByType.season],
  };
}

export function buildEventCatalogFromRecords(
  input: BuildEventCatalogInput,
  locale: AppLocale,
): EventCatalog {
  const activeExpansionGroups = input.expansionGroups
    .filter((group) => group.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn));
  const primarySeasonGroup = input.seasonGroups
    .filter((group) => group.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn))[0];
  const seasonOptions =
    primarySeasonGroup?.items
      ? getActiveSortedItems(primarySeasonGroup).map((item) =>
          toInstanceOption({
            activity: item.activity,
            activityType: "season",
            locale,
          }),
        )
      : [];
  const optionsByAddon: EventCatalog["optionsByAddon"] = {};

  for (const group of activeExpansionGroups) {
    const options = cloneEmptyOptions();

    for (const item of getActiveSortedItems(group)) {
      const activityType = activityTypeForKind(item.activity.kind);
      options[activityType].push(
        toInstanceOption({
          activity: item.activity,
          activityType,
          locale,
        }),
      );
    }

    options.season = seasonOptions;
    optionsByAddon[group.slug] = options;
  }

  const fallbackAddon = activeExpansionGroups[0]?.slug ?? "";

  return {
    addons: activeExpansionGroups.map((group) => ({
      label: locale === "ru" ? group.nameRu : group.nameEn,
      value: group.slug,
    })),
    defaultAddon: activeExpansionGroups.find((group) => group.slug === "midnight")
      ?.slug ?? fallbackAddon,
    difficulties: input.difficulties
      .filter((difficulty): difficulty is CatalogDifficultyRecord & {
        slug: EventDifficulty;
      } =>
        difficulty.isActive &&
        ["normal", "heroic", "mythic"].includes(difficulty.slug),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug))
      .map((difficulty) => ({
        difficulty: difficulty.slug,
        label: locale === "ru" ? difficulty.labelRu : difficulty.labelEn,
      })),
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
          include: { activity: true },
        },
      },
    }),
    prisma.activityGroup.findMany({
      where: { kind: "SEASON" },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }],
          include: { activity: true },
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
