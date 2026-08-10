"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EVENT_TIME_ZONE = "Europe/Moscow";
const MOSCOW_UTC_OFFSET_MINUTES = 180;
const standardRaidDifficultySlugs = new Set(["normal", "heroic", "mythic"]);

const activityTypeSchema = z.enum(["raid", "dungeon", "season", "open-world"]);
const difficultySchema = z.string().trim().min(1).max(80);
const leaderModeSchema = z.enum(["character", "manual"]);

const roleRangeSchema = z
  .object({
    max: z.number().int().nonnegative(),
    min: z.number().int().nonnegative(),
  })
  .refine((range) => range.min <= range.max, {
    message: "Role minimum cannot be greater than maximum.",
  });

const createScheduledEventInputSchema = z
  .object({
    activityType: activityTypeSchema,
    addon: z.string().trim().min(1),
    characterId: z.string(),
    date: z.string().trim(),
    difficulty: difficultySchema,
    hasPaidSlots: z.boolean(),
    hasUnroll: z.boolean(),
    leaderMode: leaderModeSchema,
    manualLeaderName: z.string(),
    manualLeaderRealm: z.string(),
    paidSlotPrice: z.number().int().nonnegative(),
    paidSlots: z.number().int().nonnegative(),
    publishTargets: z.object({
      app: z.boolean(),
      custom: z.boolean(),
      discord: z.boolean(),
      telegram: z.boolean(),
    }),
    roles: z.object({
      damage: roleRangeSchema,
      healer: roleRangeSchema,
      tank: roleRangeSchema,
    }),
    selectedInstanceSlugs: z.array(z.string().trim().min(1)).min(1),
    time: z.string().trim(),
    unrollInput: z.string(),
    unrollItemIds: z.array(z.string()),
    unrollTemplateId: z.string(),
  })
  .strict();

export type CreateScheduledEventInput = z.infer<
  typeof createScheduledEventInputSchema
>;

export type CreateScheduledEventActionResult =
  | {
      eventId: string;
      message: string;
      status: "success";
    }
  | {
      message: string;
      status: "error";
    };

type ParsedMoscowDateTime = {
  startsAt: Date;
  localDate: string;
  localTime: string;
};

const activityKindByType = {
  dungeon: "DUNGEON",
  "open-world": "OPEN_WORLD",
  raid: "RAID",
  season: "DUNGEON",
} as const;

const scheduledActivityTypeByInput = {
  dungeon: "DUNGEON",
  "open-world": "OPEN_WORLD",
  raid: "RAID",
  season: "SEASON",
} as const;

const publishTargetByInput = {
  app: "APP",
  custom: "CUSTOM",
  discord: "DISCORD",
  telegram: "TELEGRAM",
} as const;

function actionError(message: string): CreateScheduledEventActionResult {
  return { message, status: "error" };
}

function parseMoscowDateTime(
  dateValue: string,
  timeValue: string,
): ParsedMoscowDateTime | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number.parseInt(dateMatch[1], 10);
  const month = Number.parseInt(dateMatch[2], 10);
  const day = Number.parseInt(dateMatch[3], 10);
  const hour = Number.parseInt(timeMatch[1], 10);
  const minute = Number.parseInt(timeMatch[2], 10);

  if (hour > 23 || minute > 59) {
    return null;
  }

  const localTimestamp = Date.UTC(year, month - 1, day, hour, minute);
  const localDate = new Date(localTimestamp);

  if (
    localDate.getUTCFullYear() !== year ||
    localDate.getUTCMonth() !== month - 1 ||
    localDate.getUTCDate() !== day ||
    localDate.getUTCHours() !== hour ||
    localDate.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return {
    localDate: dateValue,
    localTime: timeValue,
    startsAt: new Date(localTimestamp - MOSCOW_UTC_OFFSET_MINUTES * 60_000),
  };
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }

  return result;
}

function normalizeItemIds(itemIds: string[]) {
  return uniqueValues(
    itemIds
      .map((itemId) => itemId.replace(/\D/g, ""))
      .filter((itemId) => itemId.length > 0),
  );
}

async function getAllowedActivityGroup({
  activityType,
  addonGroupId,
}: {
  activityType: CreateScheduledEventInput["activityType"];
  addonGroupId: string;
}) {
  if (activityType !== "season") {
    return { id: addonGroupId };
  }

  return prisma.activityGroup.findFirst({
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    select: { id: true },
    where: {
      isActive: true,
      kind: "SEASON",
    },
  });
}

async function isDifficultyAllowedForRaidActivities({
  activities,
  difficultyId,
  difficultySlug,
}: {
  activities: Array<{ id: string }>;
  difficultyId: string;
  difficultySlug: string;
}) {
  const rows = await prisma.activityDifficultyOption.findMany({
    select: {
      activityId: true,
      difficulty: {
        select: {
          isActive: true,
          slug: true,
        },
      },
      difficultyId: true,
    },
    where: {
      activityId: {
        in: activities.map((activity) => activity.id),
      },
    },
  });
  const rowsByActivity = new Map<string, typeof rows>();

  for (const row of rows) {
    rowsByActivity.set(row.activityId, [
      ...(rowsByActivity.get(row.activityId) ?? []),
      row,
    ]);
  }

  return activities.every((activity) => {
    const configuredRows = rowsByActivity.get(activity.id) ?? [];

    if (configuredRows.length === 0) {
      return standardRaidDifficultySlugs.has(difficultySlug);
    }

    return configuredRows.some(
      (row) =>
        row.difficultyId === difficultyId &&
        row.difficulty.slug === difficultySlug &&
        row.difficulty.isActive,
    );
  });
}

export async function createScheduledEventAction(
  rawInput: CreateScheduledEventInput,
): Promise<CreateScheduledEventActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return actionError("Нужно войти в систему, чтобы опубликовать событие.");
  }

  const parsedInput = createScheduledEventInputSchema.safeParse(rawInput);

  if (!parsedInput.success) {
    return actionError("Проверьте параметры события и попробуйте еще раз.");
  }

  const input = parsedInput.data;
  const dateTime = parseMoscowDateTime(input.date, input.time);

  if (!dateTime) {
    return actionError("Укажите корректные дату и время события.");
  }

  const publishTargets = Object.entries(input.publishTargets)
    .filter(([, isSelected]) => isSelected)
    .map(
      ([target]) =>
        publishTargetByInput[target as keyof typeof publishTargetByInput],
    );

  if (publishTargets.length === 0) {
    return actionError("Выберите хотя бы один канал публикации.");
  }

  const selectedSlugs = uniqueValues(input.selectedInstanceSlugs);

  if (selectedSlugs.length === 0) {
    return actionError("Выберите хотя бы одну активность.");
  }

  const [difficulty, addonGroup] = await Promise.all([
    prisma.eventDifficultyOption.findFirst({
      select: { id: true, slug: true },
      where: {
        isActive: true,
        slug: input.difficulty,
      },
    }),
    prisma.activityGroup.findFirst({
      select: { id: true },
      where: {
        isActive: true,
        kind: "EXPANSION",
        slug: input.addon,
      },
    }),
  ]);

  if (!difficulty) {
    return actionError("Выбранная сложность больше недоступна.");
  }

  if (!addonGroup) {
    return actionError("Выбранный аддон больше недоступен.");
  }

  const allowedGroup = await getAllowedActivityGroup({
    activityType: input.activityType,
    addonGroupId: addonGroup.id,
  });

  if (!allowedGroup) {
    return actionError("Сезонный набор активностей больше недоступен.");
  }

  const allowedItems = await prisma.activityGroupItem.findMany({
    select: {
      activity: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
    where: {
      activity: {
        isActive: true,
        kind: activityKindByType[input.activityType],
        slug: {
          in: selectedSlugs,
        },
      },
      groupId: allowedGroup.id,
    },
  });
  const activityBySlug = new Map(
    allowedItems.map((item) => [item.activity.slug, item.activity]),
  );
  const selectedActivities = selectedSlugs
    .map((slug) => activityBySlug.get(slug))
    .filter(
      (activity): activity is NonNullable<typeof activity> =>
        activity !== undefined,
    );

  if (selectedActivities.length !== selectedSlugs.length) {
    return actionError("Одна или несколько выбранных активностей недоступны.");
  }

  if (
    input.activityType === "raid" &&
    !(await isDifficultyAllowedForRaidActivities({
      activities: selectedActivities,
      difficultyId: difficulty.id,
      difficultySlug: difficulty.slug,
    }))
  ) {
    return actionError(
      "Выбранная сложность недоступна для одного или нескольких рейдов.",
    );
  }

  let leaderCharacterId: string | null = null;
  let leaderName = "";
  let leaderRealm = "";

  if (input.leaderMode === "character") {
    const character = await prisma.character.findFirst({
      select: {
        id: true,
        name: true,
        realm: true,
      },
      where: {
        id: input.characterId,
        isActive: true,
        userId: session.user.id,
      },
    });

    if (!character) {
      return actionError("Выбранный персонаж-лидер недоступен.");
    }

    leaderCharacterId = character.id;
    leaderName = character.name;
    leaderRealm = character.realm;
  } else {
    leaderName = input.manualLeaderName.trim();
    leaderRealm = input.manualLeaderRealm.trim();

    if (!leaderName || !leaderRealm) {
      return actionError("Укажите имя и realm лидера.");
    }
  }

  const event = await prisma.scheduledEvent
    .create({
      data: {
        activities: {
          create: selectedActivities.map((activity, index) => ({
            activityId: activity.id,
            sortOrder: index,
          })),
        },
        activityType: scheduledActivityTypeByInput[input.activityType],
        addonSlug: input.addon,
        damageMax: input.roles.damage.max,
        damageMin: input.roles.damage.min,
        difficultyId: difficulty.id,
        hasPaidSlots: input.hasPaidSlots,
        hasUnroll: input.hasUnroll,
        healerMax: input.roles.healer.max,
        healerMin: input.roles.healer.min,
        leaderCharacterId,
        leaderMode: input.leaderMode === "character" ? "CHARACTER" : "MANUAL",
        leaderName,
        leaderRealm,
        localDate: dateTime.localDate,
        localTime: dateTime.localTime,
        paidSlotPrice: input.hasPaidSlots ? input.paidSlotPrice : 0,
        paidSlots: input.hasPaidSlots ? input.paidSlots : 0,
        publishTargets,
        startsAt: dateTime.startsAt,
        status: "PUBLISHED",
        tankMax: input.roles.tank.max,
        tankMin: input.roles.tank.min,
        timeZone: EVENT_TIME_ZONE,
        unrollItemIds: input.hasUnroll
          ? normalizeItemIds(input.unrollItemIds)
          : [],
        unrollTemplateId: input.hasUnroll ? input.unrollTemplateId || null : null,
        userId: session.user.id,
      },
      select: { id: true },
    })
    .catch(() => null);

  if (!event) {
    return actionError("Не удалось сохранить событие. Попробуйте еще раз.");
  }

  revalidatePath("/profile");

  return {
    eventId: event.id,
    message: "Событие сохранено.",
    status: "success",
  };
}
