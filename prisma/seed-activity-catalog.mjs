import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  currentExpansionDungeons,
  currentSeasonDungeons,
  allDungeonInstances,
} = await jiti.import("../src/lib/dungeons.ts");
const { allRaidInstances } = await jiti.import("../src/lib/raids.ts");
const {
  currentSeasonGroupDefinition,
  dungeonSlugsByAddonSlug,
  eventAddonDefinitions,
  eventDifficultyDefinitions,
  openWorldActivityDefinitions,
} = await jiti.import("../src/lib/activity-catalog-source.ts");

try {
  process.loadEnvFile?.(".env");
} catch {
  // Existing environment variables are enough in hosted environments.
}

const prisma = new PrismaClient();

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const addonByName = new Map(
  eventAddonDefinitions.map((addon) => [addon.nameEn, addon]),
);

function getExpansionGroupSlug(expansion) {
  return addonByName.get(expansion)?.slug ?? slugify(expansion);
}

async function createActivityIfMissing(data) {
  const existing = await prisma.activity.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.activity.create({ data });
}

async function createGroupIfMissing(data) {
  const existing = await prisma.activityGroup.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.activityGroup.create({ data });
}

async function createDifficultyIfMissing(data) {
  const existing = await prisma.eventDifficultyOption.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.eventDifficultyOption.create({ data });
}

async function createGroupItemIfMissing({ groupId, activityId, sortOrder }) {
  const existing = await prisma.activityGroupItem.findUnique({
    where: {
      groupId_activityId: {
        activityId,
        groupId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.activityGroupItem.create({
    data: {
      activityId,
      groupId,
      sortOrder,
    },
  });
}

function raidActivityData(raid, sortOrder) {
  return {
    aliases: raid.aliases,
    artPath: raid.artPath,
    kind: "RAID",
    nameEn: raid.names?.en ?? raid.name,
    nameRu: raid.names?.ru ?? raid.name,
    shortNameEn: raid.shortName,
    shortNameRu: raid.shortName,
    slug: raid.slug,
    sortOrder,
    warcraftLogsZoneId: raid.warcraftLogsZoneId ?? null,
    warcraftLogsZoneName: raid.warcraftLogsZoneName ?? null,
  };
}

function dungeonActivityData(dungeon, sortOrder) {
  return {
    aliases: [],
    artPath: dungeon.artPath,
    kind: "DUNGEON",
    nameEn: dungeon.names.en,
    nameRu: dungeon.names.ru,
    shortNameEn: dungeon.shortName,
    shortNameRu: dungeon.shortName,
    slug: dungeon.slug,
    sortOrder,
  };
}

function openWorldActivityData(activity) {
  return {
    aliases: [],
    artPath: activity.artPath,
    kind: "OPEN_WORLD",
    nameEn: activity.nameEn,
    nameRu: activity.nameRu,
    shortNameEn: activity.shortNameEn,
    shortNameRu: activity.shortNameRu,
    slug: activity.slug,
    sortOrder: activity.sortOrder,
  };
}

async function seedActivities() {
  const activityIds = new Map();

  for (const [index, raid] of allRaidInstances.entries()) {
    const activity = await createActivityIfMissing(raidActivityData(raid, index));
    activityIds.set(raid.slug, activity.id);
  }

  for (const [index, dungeon] of allDungeonInstances.entries()) {
    const activity = await createActivityIfMissing(
      dungeonActivityData(dungeon, index),
    );
    activityIds.set(dungeon.slug, activity.id);
  }

  for (const activitySource of openWorldActivityDefinitions) {
    const activity = await createActivityIfMissing(
      openWorldActivityData(activitySource),
    );
    activityIds.set(activitySource.slug, activity.id);
  }

  return activityIds;
}

async function seedGroups() {
  const groupIds = new Map();
  const activeAddonSlugs = new Set(
    eventAddonDefinitions.map((addon) => addon.slug),
  );
  const seededExpansionSlugs = new Set();

  for (const addon of eventAddonDefinitions) {
    const group = await createGroupIfMissing({
      kind: "EXPANSION",
      nameEn: addon.nameEn,
      nameRu: addon.nameRu,
      slug: addon.slug,
      sortOrder: addon.sortOrder,
    });
    groupIds.set(addon.slug, group.id);
    seededExpansionSlugs.add(addon.slug);
  }

  const raidExpansions = Array.from(
    new Set(allRaidInstances.map((raid) => raid.expansion)),
  );

  for (const [index, expansion] of raidExpansions.entries()) {
    const slug = getExpansionGroupSlug(expansion);

    if (seededExpansionSlugs.has(slug)) {
      continue;
    }

    const group = await createGroupIfMissing({
      isActive: activeAddonSlugs.has(slug),
      kind: "EXPANSION",
      nameEn: expansion,
      nameRu: expansion,
      slug,
      sortOrder: eventAddonDefinitions.length + index,
    });
    groupIds.set(slug, group.id);
    seededExpansionSlugs.add(slug);
  }

  const seasonGroup = await createGroupIfMissing({
    kind: "SEASON",
    nameEn: currentSeasonGroupDefinition.nameEn,
    nameRu: currentSeasonGroupDefinition.nameRu,
    slug: currentSeasonGroupDefinition.slug,
    sortOrder: currentSeasonGroupDefinition.sortOrder,
  });
  groupIds.set(currentSeasonGroupDefinition.slug, seasonGroup.id);

  return groupIds;
}

async function seedGroupItems(activityIds, groupIds) {
  for (const [index, raid] of allRaidInstances.entries()) {
    const groupId = groupIds.get(getExpansionGroupSlug(raid.expansion));
    const activityId = activityIds.get(raid.slug);

    if (groupId && activityId) {
      await createGroupItemIfMissing({ activityId, groupId, sortOrder: index });
    }
  }

  for (const [addonSlug, dungeonSlugs] of Object.entries(dungeonSlugsByAddonSlug)) {
    const groupId = groupIds.get(addonSlug);

    for (const [index, dungeonSlug] of dungeonSlugs.entries()) {
      const activityId = activityIds.get(dungeonSlug);

      if (groupId && activityId) {
        await createGroupItemIfMissing({ activityId, groupId, sortOrder: index });
      }
    }
  }

  for (const addon of eventAddonDefinitions) {
    const groupId = groupIds.get(addon.slug);

    for (const activity of openWorldActivityDefinitions) {
      const activityId = activityIds.get(activity.slug);

      if (groupId && activityId) {
        await createGroupItemIfMissing({
          activityId,
          groupId,
          sortOrder: activity.sortOrder,
        });
      }
    }
  }

  const seasonGroupId = groupIds.get(currentSeasonGroupDefinition.slug);

  for (const [index, dungeon] of currentSeasonDungeons.entries()) {
    const activityId = activityIds.get(dungeon.slug);

    if (seasonGroupId && activityId) {
      await createGroupItemIfMissing({
        activityId,
        groupId: seasonGroupId,
        sortOrder: index,
      });
    }
  }

  for (const [index, dungeon] of currentExpansionDungeons.entries()) {
    const groupId = groupIds.get("midnight");
    const activityId = activityIds.get(dungeon.slug);

    if (groupId && activityId) {
      await createGroupItemIfMissing({ activityId, groupId, sortOrder: index });
    }
  }
}

async function seedDifficulties() {
  for (const difficulty of eventDifficultyDefinitions) {
    await createDifficultyIfMissing({
      labelEn: difficulty.labelEn,
      labelRu: difficulty.labelRu,
      slug: difficulty.slug,
      sortOrder: difficulty.sortOrder,
    });
  }
}

async function main() {
  const activityIds = await seedActivities();
  const groupIds = await seedGroups();
  await seedGroupItems(activityIds, groupIds);
  await seedDifficulties();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
