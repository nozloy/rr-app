"use server";

import {
  Prisma,
  type EventPublishTarget,
  type ExternalPublishTarget,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  deliverScheduledEvent,
  getEventChannelAvailability,
  type DeliverySummary,
} from "@/lib/event-publication";
import {
  scheduledEventInputSchema,
  eventTimeZoneSchema,
  type ScheduledEventInput,
} from "@/lib/event-schema";
import { isValidTimeZone, parseEventDateTime } from "@/lib/event-time";
import { prisma } from "@/lib/prisma";

const standardRaidDifficultySlugs = new Set(["normal", "heroic", "mythic"]);

export type CreateScheduledEventInput = ScheduledEventInput;
export type UpdateScheduledEventInput = ScheduledEventInput & {
  eventId: string;
  version: number;
};

export type EventMutationActionResult =
  | {
      deliveries: DeliverySummary[];
      eventId: string;
      message: string;
      status: "success";
      version: number;
      warnings: string[];
    }
  | {
      conflict?: boolean;
      fieldErrors?: Record<string, string[]>;
      message: string;
      status: "error";
    };

export type CreateScheduledEventActionResult = EventMutationActionResult;

type ValidatedEventInput = {
  dateTime: NonNullable<ReturnType<typeof parseEventDateTime>>;
  difficulty: { id: string; slug: string };
  input: ScheduledEventInput;
  leaderCharacterId: string | null;
  leaderName: string;
  leaderRealm: string;
  publishTargets: EventPublishTarget[];
  selectedActivities: Array<{ id: string; slug: string }>;
};

class VersionConflictError extends Error {}

const activityKindByType = {
  dungeon: "DUNGEON",
  "open-world": "OPEN_WORLD",
  raid: "RAID",
} as const;

const scheduledActivityTypeByInput = {
  dungeon: "DUNGEON",
  "open-world": "OPEN_WORLD",
  raid: "RAID",
} as const;

function actionError(
  message: string,
  options: {
    conflict?: boolean;
    fieldErrors?: Record<string, string[]>;
  } = {},
): EventMutationActionResult {
  return { message, status: "error", ...options };
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}

function normalizeItemIds(itemIds: string[]) {
  return uniqueValues(
    itemIds
      .map((itemId) => itemId.replace(/\D/g, ""))
      .filter((itemId) => itemId.length > 0),
  );
}

function getPublishTargets(
  input: ScheduledEventInput["publishTargets"],
): EventPublishTarget[] {
  const targets: EventPublishTarget[] = [];

  if (input.app) targets.push("APP");
  if (input.discord) targets.push("DISCORD");
  if (input.telegram) targets.push("TELEGRAM");

  return targets;
}

function getExternalTargets(publishTargets: EventPublishTarget[]) {
  return publishTargets.filter(
    (target): target is ExternalPublishTarget =>
      target === "DISCORD" || target === "TELEGRAM",
  );
}

async function getAllowedActivityGroup({
  addon,
  addonGroupId,
  contentScope,
}: {
  addon: string;
  addonGroupId: string;
  contentScope: string;
}) {
  if (contentScope === "expansion") {
    return { id: addonGroupId };
  }

  if (!contentScope.startsWith(`${addon}-season-`)) {
    return null;
  }

  return prisma.activityGroup.findFirst({
    select: { id: true },
    where: {
      isActive: true,
      kind: "SEASON",
      slug: contentScope,
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
      difficulty: { select: { isActive: true, slug: true } },
      difficultyId: true,
    },
    where: { activityId: { in: activities.map((activity) => activity.id) } },
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

async function validateEventInput(
  rawInput: ScheduledEventInput,
  userId: string,
): Promise<ValidatedEventInput | EventMutationActionResult> {
  const parsedInput = scheduledEventInputSchema.safeParse(rawInput);

  if (!parsedInput.success) {
    return actionError("Проверьте параметры события и попробуйте ещё раз.", {
      fieldErrors: parsedInput.error.flatten().fieldErrors,
    });
  }

  const input = parsedInput.data;
  const dateTime = parseEventDateTime(input.date, input.time, input.timeZone);

  if (!dateTime) {
    return actionError(
      "Укажите существующие дату, время и часовой пояс события.",
    );
  }

  if (dateTime.startsAt.getTime() <= Date.now()) {
    return actionError("Дата начала события должна быть в будущем.");
  }

  const channelAvailability = getEventChannelAvailability();

  if (input.publishTargets.discord && !channelAvailability.discord) {
    return actionError("Discord не настроен на сервере.");
  }

  if (input.publishTargets.telegram && !channelAvailability.telegram) {
    return actionError("Telegram не настроен на сервере.");
  }

  const selectedSlugs = uniqueValues(input.selectedInstanceSlugs);
  const [difficulty, addonGroup] = await Promise.all([
    prisma.eventDifficultyOption.findFirst({
      select: { id: true, slug: true },
      where: { isActive: true, slug: input.difficulty },
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
    return actionError("Выбранное дополнение больше недоступно.");
  }

  const allowedGroup = await getAllowedActivityGroup({
    addon: input.addon,
    addonGroupId: addonGroup.id,
    contentScope: input.contentScope,
  });

  if (!allowedGroup) {
    return actionError("Сезонный набор активностей больше недоступен.");
  }

  const allowedItems = await prisma.activityGroupItem.findMany({
    select: { activity: { select: { id: true, slug: true } } },
    where: {
      activity: {
        isActive: true,
        kind: activityKindByType[input.activityType],
        slug: { in: selectedSlugs },
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
  let leaderName = input.manualLeaderName;
  let leaderRealm = input.manualLeaderRealm;

  if (input.leaderMode === "character") {
    const character = await prisma.character.findFirst({
      select: { id: true, name: true, realm: true },
      where: {
        id: input.characterId,
        isActive: true,
        userId,
      },
    });

    if (!character) {
      return actionError("Выбранный персонаж-лидер недоступен.");
    }

    leaderCharacterId = character.id;
    leaderName = character.name;
    leaderRealm = character.realm;
  } else if (!leaderName || !leaderRealm) {
    return actionError("Укажите имя и игровой мир лидера.");
  }

  return {
    dateTime,
    difficulty,
    input,
    leaderCharacterId,
    leaderName,
    leaderRealm,
    publishTargets: getPublishTargets(input.publishTargets),
    selectedActivities,
  };
}

function eventData(validated: ValidatedEventInput) {
  const { dateTime, difficulty, input } = validated;

  return {
    activityType: scheduledActivityTypeByInput[input.activityType],
    addonSlug: input.addon,
    contentScope: input.contentScope,
    damageMax: input.roles.damage.max,
    damageMin: input.roles.damage.min,
    difficultyId: difficulty.id,
    hasPaidSlots: input.hasPaidSlots,
    hasUnroll: input.hasUnroll,
    healerMax: input.roles.healer.max,
    healerMin: input.roles.healer.min,
    leaderCharacterId: validated.leaderCharacterId,
    leaderMode: input.leaderMode === "character" ? "CHARACTER" : "MANUAL",
    leaderName: validated.leaderName,
    leaderRealm: validated.leaderRealm,
    localDate: dateTime.localDate,
    localTime: dateTime.localTime,
    paidSlotPrice: input.hasPaidSlots ? input.paidSlotPrice : 0,
    paidSlots: input.hasPaidSlots ? input.paidSlots : 0,
    publishTargets: validated.publishTargets,
    startsAt: dateTime.startsAt,
    tankMax: input.roles.tank.max,
    tankMin: input.roles.tank.min,
    timeZone: dateTime.timeZone,
    unrollItemIds: input.hasUnroll
      ? normalizeItemIds(input.unrollItemIds)
      : [],
    unrollTemplateId:
      input.hasUnroll && input.unrollTemplateId
        ? input.unrollTemplateId
        : null,
  } satisfies Prisma.ScheduledEventUncheckedUpdateManyInput;
}

function deliveryWarnings(deliveries: DeliverySummary[]) {
  return deliveries
    .filter((delivery) => delivery.status === "FAILED")
    .map(
      (delivery) =>
        delivery.lastErrorMessage ??
        `Не удалось обновить ${delivery.target === "DISCORD" ? "Discord" : "Telegram"}.`,
    );
}

async function currentDeliveries(eventId: string): Promise<DeliverySummary[]> {
  const deliveries = await prisma.scheduledEventDelivery.findMany({
    select: {
      lastErrorCode: true,
      lastErrorMessage: true,
      status: true,
      target: true,
    },
    where: { eventId },
  });

  return deliveries;
}

async function runDelivery(
  eventId: string,
  requestedTargets?: ExternalPublishTarget[],
) {
  try {
    return await deliverScheduledEvent(eventId, requestedTargets);
  } catch {
    const deliveries = await currentDeliveries(eventId);

    return requestedTargets
      ? deliveries.filter((delivery) => requestedTargets.includes(delivery.target))
      : deliveries;
  }
}

function revalidateEventPaths(eventId: string) {
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/profile");
}

async function successResult(
  eventId: string,
  version: number,
  message: string,
  deliveries?: DeliverySummary[],
): Promise<EventMutationActionResult> {
  const resolvedDeliveries = deliveries ?? (await currentDeliveries(eventId));

  return {
    deliveries: resolvedDeliveries,
    eventId,
    message,
    status: "success",
    version,
    warnings: deliveryWarnings(resolvedDeliveries),
  };
}

export async function createScheduledEventAction(
  rawInput: CreateScheduledEventInput,
): Promise<CreateScheduledEventActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return actionError("Нужно войти в систему, чтобы создать событие.");
  }

  const parsedRequestId = z.string().uuid().safeParse(rawInput?.clientRequestId);

  if (parsedRequestId.success) {
    const duplicate = await prisma.scheduledEvent.findFirst({
      select: { id: true, version: true },
      where: {
        clientRequestId: parsedRequestId.data,
        userId: session.user.id,
      },
    });

    if (duplicate) {
      const deliveries = await runDelivery(duplicate.id);
      return successResult(
        duplicate.id,
        duplicate.version,
        "Событие уже было сохранено.",
        deliveries,
      );
    }
  }

  const validated = await validateEventInput(rawInput, session.user.id);

  if ("status" in validated) {
    return validated;
  }

  try {
    const created = await prisma.$transaction(async (transaction) => {
      const event = await transaction.scheduledEvent.create({
        data: {
          ...eventData(validated),
          activities: {
            create: validated.selectedActivities.map((activity, index) => ({
              activityId: activity.id,
              sortOrder: index,
            })),
          },
          clientRequestId: validated.input.clientRequestId,
          deliveries: {
            create: getExternalTargets(validated.publishTargets).map((target) => ({
              target,
            })),
          },
          status: "PUBLISHED",
          userId: session.user.id,
        },
        select: { id: true, version: true },
      });

      await transaction.user.update({
        data: { timeZone: validated.input.timeZone },
        where: { id: session.user.id },
      });

      return event;
    });
    const deliveries = await runDelivery(created.id);
    revalidateEventPaths(created.id);

    return successResult(
      created.id,
      created.version,
      "Событие сохранено.",
      deliveries,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate = await prisma.scheduledEvent.findFirst({
        select: { id: true, version: true },
        where: {
          clientRequestId: validated.input.clientRequestId,
          userId: session.user.id,
        },
      });

      if (duplicate) {
        const deliveries = await runDelivery(duplicate.id);
        return successResult(
          duplicate.id,
          duplicate.version,
          "Событие уже было сохранено.",
          deliveries,
        );
      }
    }

    console.error("Failed to create scheduled event", error);
    return actionError("Не удалось сохранить событие. Попробуйте ещё раз.");
  }
}

export async function updateScheduledEventAction(
  rawInput: UpdateScheduledEventInput,
): Promise<EventMutationActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return actionError("Нужно войти в систему, чтобы изменить событие.");
  }

  const editMeta = z
    .object({ eventId: z.string().min(1), version: z.number().int().positive() })
    .safeParse(rawInput);

  if (!editMeta.success) {
    return actionError("Некорректные параметры редактирования.");
  }

  const existing = await prisma.scheduledEvent.findFirst({
    include: { deliveries: true },
    where: { id: editMeta.data.eventId, userId: session.user.id },
  });

  if (!existing) {
    return actionError("Событие не найдено.");
  }

  if (existing.status === "CANCELLED") {
    return actionError("Отменённое событие нельзя редактировать.");
  }

  if (existing.startsAt.getTime() <= Date.now()) {
    return actionError("Начавшееся событие нельзя редактировать.");
  }

  if (existing.version !== editMeta.data.version) {
    return actionError("Событие уже изменилось. Обновите страницу.", {
      conflict: true,
    });
  }

  const { eventId: _eventId, version: _version, ...eventInput } = rawInput;
  void _eventId;
  void _version;
  const validated = await validateEventInput(eventInput, session.user.id);

  if ("status" in validated) {
    return validated;
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const updateData = eventData(validated);

      if (existing.publishTargets.includes("CUSTOM")) {
        updateData.publishTargets = [
          ...validated.publishTargets,
          "CUSTOM",
        ];
      }

      const update = await transaction.scheduledEvent.updateMany({
        data: { ...updateData, version: { increment: 1 } },
        where: {
          id: existing.id,
          startsAt: { gt: new Date() },
          status: "PUBLISHED",
          userId: session.user.id,
          version: existing.version,
        },
      });

      if (update.count !== 1) {
        throw new VersionConflictError();
      }

      await transaction.scheduledEventActivity.deleteMany({
        where: { eventId: existing.id },
      });
      await transaction.scheduledEventActivity.createMany({
        data: validated.selectedActivities.map((activity, index) => ({
          activityId: activity.id,
          eventId: existing.id,
          sortOrder: index,
        })),
      });

      for (const target of getExternalTargets(validated.publishTargets)) {
        await transaction.scheduledEventDelivery.upsert({
          create: { eventId: existing.id, target },
          update: {},
          where: { eventId_target: { eventId: existing.id, target } },
        });
      }

      await transaction.user.update({
        data: { timeZone: validated.input.timeZone },
        where: { id: session.user.id },
      });
    });
    const deliveries = await runDelivery(existing.id);
    revalidateEventPaths(existing.id);

    return successResult(
      existing.id,
      existing.version + 1,
      "Событие обновлено.",
      deliveries,
    );
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return actionError("Событие уже изменилось. Обновите страницу.", {
        conflict: true,
      });
    }

    console.error("Failed to update scheduled event", error);
    return actionError("Не удалось обновить событие. Попробуйте ещё раз.");
  }
}

export async function cancelScheduledEventAction(input: {
  eventId: string;
  version: number;
}): Promise<EventMutationActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return actionError("Нужно войти в систему, чтобы отменить событие.");
  }

  const parsed = z
    .object({ eventId: z.string().min(1), version: z.number().int().positive() })
    .safeParse(input);

  if (!parsed.success) {
    return actionError("Некорректные параметры отмены.");
  }

  const existing = await prisma.scheduledEvent.findFirst({
    select: { id: true, status: true, version: true },
    where: { id: parsed.data.eventId, userId: session.user.id },
  });

  if (!existing) {
    return actionError("Событие не найдено.");
  }

  if (existing.status === "CANCELLED") {
    return successResult(
      existing.id,
      existing.version,
      "Событие уже отменено.",
    );
  }

  try {
    const update = await prisma.scheduledEvent.updateMany({
      data: {
        cancelledAt: new Date(),
        status: "CANCELLED",
        version: { increment: 1 },
      },
      where: {
        id: existing.id,
        status: "PUBLISHED",
        userId: session.user.id,
        version: parsed.data.version,
      },
    });

    if (update.count !== 1) {
      return actionError("Событие уже изменилось. Обновите страницу.", {
        conflict: true,
      });
    }

    const deliveries = await runDelivery(existing.id);
    revalidateEventPaths(existing.id);

    return successResult(
      existing.id,
      existing.version + 1,
      "Событие отменено.",
      deliveries,
    );
  } catch (error) {
    console.error("Failed to cancel scheduled event", error);
    return actionError("Не удалось отменить событие. Попробуйте ещё раз.");
  }
}

export async function retryScheduledEventDeliveryAction(input: {
  eventId: string;
  target: ExternalPublishTarget;
}): Promise<EventMutationActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return actionError("Нужно войти в систему, чтобы повторить публикацию.");
  }

  const parsed = z
    .object({
      eventId: z.string().min(1),
      target: z.enum(["DISCORD", "TELEGRAM"]),
    })
    .safeParse(input);

  if (!parsed.success) {
    return actionError("Некорректные параметры публикации.");
  }

  const event = await prisma.scheduledEvent.findFirst({
    include: { deliveries: true },
    where: { id: parsed.data.eventId, userId: session.user.id },
  });

  if (!event) {
    return actionError("Событие не найдено.");
  }

  const existingDelivery = event.deliveries.some(
    (delivery) => delivery.target === parsed.data.target,
  );
  const selected = event.publishTargets.includes(parsed.data.target);

  if (!existingDelivery && !selected) {
    return actionError("Этот канал не связан с событием.");
  }

  const deliveries = await runDelivery(event.id, [parsed.data.target]);
  revalidateEventPaths(event.id);

  return successResult(
    event.id,
    event.version,
    deliveryWarnings(deliveries).length > 0
      ? "Повторная публикация завершилась с ошибкой."
      : "Публикация обновлена.",
    deliveries,
  );
}

export async function updateUserTimeZoneAction(rawTimeZone: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { message: "Нужно войти в систему.", status: "error" as const };
  }

  const parsed = eventTimeZoneSchema.safeParse(rawTimeZone);

  if (!parsed.success || !isValidTimeZone(parsed.data)) {
    return { message: "Некорректный часовой пояс.", status: "error" as const };
  }

  try {
    await prisma.user.update({
      data: { timeZone: parsed.data },
      where: { id: session.user.id },
    });

    revalidatePath("/events/new");
    return { message: "Часовой пояс сохранён.", status: "success" as const };
  } catch (error) {
    console.error("Failed to update event time zone", error);
    return { message: "Не удалось сохранить часовой пояс.", status: "error" as const };
  }
}
