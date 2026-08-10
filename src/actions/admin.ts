"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AdminActionResult = {
  status: "success" | "error";
  message: string;
};

export type AdminCatalogTarget =
  | "activity"
  | "activityGroup"
  | "eventDifficultyOption";

export type AdminActivityKind = "RAID" | "DUNGEON" | "OPEN_WORLD";

export type AdminCacheTarget =
  | "warcraftLogs"
  | "raiderIo"
  | "blizzardEquipment"
  | "all";

export type SaveActivityGroupInput = {
  artPath?: string | null;
  id?: string;
  isActive?: boolean;
  nameEn: string;
  nameRu: string;
  slug: string;
  sortOrder?: number;
};

export type SaveActivityInput = {
  aliases?: string[];
  artPath?: string;
  id?: string;
  isActive?: boolean;
  kind: AdminActivityKind;
  nameEn: string;
  nameRu: string;
  shortNameEn: string;
  shortNameRu: string;
  slug: string;
  sortOrder?: number;
};

const STALE_CACHE_DATE = new Date("1970-01-01T00:00:00.000Z");

function success(message: string): AdminActionResult {
  return { status: "success", message };
}

function error(message: string): AdminActionResult {
  return { status: "error", message };
}

async function getAdminActor() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { ok: false as const, result: error("Нужна авторизация.") };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true },
  });

  if (!user?.isAdmin) {
    return { ok: false as const, result: error("Недостаточно прав.") };
  }

  return { ok: true as const, userId: user.id };
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getFormBoolean(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .some((value) => value === "true" || value === "on");
}

function getFormNumber(formData: FormData, key: string) {
  const value = Number(getFormString(formData, key));

  return Number.isFinite(value) ? value : 0;
}

function getOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function getRequiredString(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function parseAliases(value: string) {
  return uniqueStrings(value.split(/[\n,]+/));
}

function isActivityKind(value: string): value is AdminActivityKind {
  return value === "RAID" || value === "DUNGEON" || value === "OPEN_WORLD";
}

function isCatalogTarget(value: string): value is AdminCatalogTarget {
  return (
    value === "activity" ||
    value === "activityGroup" ||
    value === "eventDifficultyOption"
  );
}

function isCacheTarget(value: string): value is AdminCacheTarget {
  return (
    value === "warcraftLogs" ||
    value === "raiderIo" ||
    value === "blizzardEquipment" ||
    value === "all"
  );
}

function revalidateAdminCatalog() {
  revalidatePath("/dashboard");
  revalidatePath("/events/new");
  revalidatePath("/banners/new");
}

export async function setUserAdminAction(
  userId: string,
  isAdmin: boolean,
): Promise<AdminActionResult> {
  const actor = await getAdminActor();

  if (!actor.ok) {
    return actor.result;
  }

  const targetId = userId.trim();

  if (!targetId) {
    return error("Не указан пользователь.");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, isAdmin: true, name: true },
  });

  if (!target) {
    return error("Пользователь не найден.");
  }

  if (!isAdmin && target.id === actor.userId) {
    return error("Нельзя снять admin-флаг с текущего пользователя.");
  }

  if (!isAdmin && target.isAdmin) {
    const adminCount = await prisma.user.count({
      where: { isAdmin: true },
    });

    if (adminCount <= 1) {
      return error("Нельзя оставить систему без администраторов.");
    }
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { isAdmin },
  });

  revalidatePath("/dashboard");

  return success(
    isAdmin
      ? `Admin-флаг включен для ${target.name ?? target.id}.`
      : `Admin-флаг выключен для ${target.name ?? target.id}.`,
  );
}

export async function setUserAdminFormAction(
  formData: FormData,
): Promise<void> {
  await setUserAdminAction(
    getFormString(formData, "userId"),
    getFormBoolean(formData, "isAdmin"),
  );
}

export async function setUserPremiumAction(
  userId: string,
  isPremium: boolean,
  premiumExpiresAt: Date | null = null,
): Promise<AdminActionResult> {
  const actor = await getAdminActor();

  if (!actor.ok) {
    return actor.result;
  }

  const targetId = userId.trim();

  if (!targetId) {
    return error("Не указан пользователь.");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, name: true },
  });

  if (!target) {
    return error("Пользователь не найден.");
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      isPremium,
      premiumExpiresAt: isPremium ? premiumExpiresAt : null,
    },
  });

  revalidatePath("/dashboard");

  const premiumUntil = premiumExpiresAt
    ? ` до ${premiumExpiresAt.toLocaleDateString("ru-RU")}`
    : "";

  return success(
    isPremium
      ? `Premium включен для ${target.name ?? target.id}${premiumUntil}.`
      : `Premium выключен для ${target.name ?? target.id}.`,
  );
}

function getPremiumExpiresAt(formData: FormData) {
  const rawDays = getFormString(formData, "premiumDurationDays");

  if (rawDays === "permanent") {
    return null;
  }

  const days = Number(rawDays);

  if (!Number.isFinite(days) || days <= 0) {
    return null;
  }

  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function setUserPremiumFormAction(
  formData: FormData,
): Promise<void> {
  const isPremium = getFormBoolean(formData, "isPremium");

  await setUserPremiumAction(
    getFormString(formData, "userId"),
    isPremium,
    isPremium ? getPremiumExpiresAt(formData) : null,
  );
}

export async function saveActivityGroupAction(
  input: SaveActivityGroupInput,
): Promise<AdminActionResult> {
  const actor = await getAdminActor();

  if (!actor.ok) {
    return actor.result;
  }

  const id = getRequiredString(input.id);
  const slug = getRequiredString(input.slug);
  const nameRu = getRequiredString(input.nameRu);
  const nameEn = getRequiredString(input.nameEn);

  if (!slug || !nameRu || !nameEn) {
    return error("Укажите slug и названия дополнения.");
  }

  const data = {
    artPath: getOptionalString(input.artPath),
    isActive: input.isActive ?? true,
    kind: "EXPANSION" as const,
    nameEn,
    nameRu,
    slug,
    sortOrder: input.sortOrder ?? 0,
  };

  if (id) {
    const existing = await prisma.activityGroup.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return error("Дополнение не найдено.");
    }

    await prisma.activityGroup.update({
      data,
      where: { id },
    });
  } else {
    await prisma.activityGroup.create({ data });
  }

  revalidateAdminCatalog();

  return success("Дополнение сохранено.");
}

export async function saveActivityGroupFormAction(
  formData: FormData,
): Promise<void> {
  await saveActivityGroupAction({
    artPath: getFormString(formData, "artPath"),
    id: getFormString(formData, "id"),
    isActive: getFormBoolean(formData, "isActive"),
    nameEn: getFormString(formData, "nameEn"),
    nameRu: getFormString(formData, "nameRu"),
    slug: getFormString(formData, "slug"),
    sortOrder: getFormNumber(formData, "sortOrder"),
  });
}

async function saveActivityRecord(input: SaveActivityInput): Promise<
  | {
      id: string;
      ok: true;
    }
  | {
      ok: false;
      result: AdminActionResult;
    }
> {
  const id = getRequiredString(input.id);
  const slug = getRequiredString(input.slug);
  const nameRu = getRequiredString(input.nameRu);
  const nameEn = getRequiredString(input.nameEn);
  const shortNameRu = getRequiredString(input.shortNameRu);
  const shortNameEn = getRequiredString(input.shortNameEn);

  if (!isActivityKind(input.kind)) {
    return { ok: false, result: error("Неизвестный тип активности.") };
  }

  if (!slug || !nameRu || !nameEn || !shortNameRu || !shortNameEn) {
    return {
      ok: false,
      result: error("Укажите slug, названия и короткие названия активности."),
    };
  }

  const data = {
    aliases: input.aliases ?? [],
    artPath: getOptionalString(input.artPath) ?? "/home/raid-reminder-mark.png",
    isActive: input.isActive ?? true,
    kind: input.kind,
    nameEn,
    nameRu,
    shortNameEn,
    shortNameRu,
    slug,
    sortOrder: input.sortOrder ?? 0,
  };

  if (id) {
    const existing = await prisma.activity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return { ok: false, result: error("Активность не найдена.") };
    }

    await prisma.activity.update({
      data,
      where: { id },
    });

    return { id, ok: true };
  } else {
    const created = await prisma.activity.create({
      data,
      select: { id: true },
    });

    return { id: created.id, ok: true };
  }
}

export async function saveActivityAction(
  input: SaveActivityInput,
): Promise<AdminActionResult> {
  const actor = await getAdminActor();

  if (!actor.ok) {
    return actor.result;
  }

  const saved = await saveActivityRecord(input);

  if (!saved.ok) {
    return saved.result;
  }

  revalidateAdminCatalog();

  return success("Активность сохранена.");
}

export async function saveActivityFormAction(
  formData: FormData,
): Promise<void> {
  const kind = getFormString(formData, "kind");

  if (!isActivityKind(kind)) {
    return;
  }

  await saveActivityAction({
    aliases: parseAliases(getFormString(formData, "aliases")),
    artPath: getFormString(formData, "artPath"),
    id: getFormString(formData, "id"),
    isActive: getFormBoolean(formData, "isActive"),
    kind,
    nameEn: getFormString(formData, "nameEn"),
    nameRu: getFormString(formData, "nameRu"),
    shortNameEn: getFormString(formData, "shortNameEn"),
    shortNameRu: getFormString(formData, "shortNameRu"),
    slug: getFormString(formData, "slug"),
    sortOrder: getFormNumber(formData, "sortOrder"),
  });
}

function getFormStringArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

async function syncActivityGroupLinks(
  activityId: string,
  groupIds: string[],
  options?: { requireSingleGroup?: boolean },
) {
  const targetGroupIds = uniqueStrings(groupIds);

  if (options?.requireSingleGroup && targetGroupIds.length !== 1) {
    return error("Для рейда или данжа нужно выбрать ровно одно дополнение.");
  }

  if (targetGroupIds.length > 0) {
    const groups = await prisma.activityGroup.findMany({
      where: {
        id: { in: targetGroupIds },
        kind: "EXPANSION",
      },
      select: { id: true },
    });

    if (groups.length !== targetGroupIds.length) {
      return error("Одно или несколько дополнений не найдены.");
    }
  }

  await prisma.$transaction([
    prisma.activityGroupItem.deleteMany({ where: { activityId } }),
    ...(targetGroupIds.length > 0
      ? [
          prisma.activityGroupItem.createMany({
            data: targetGroupIds.map((groupId, index) => ({
              activityId,
              groupId,
              sortOrder: index,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  return success("Связи дополнений сохранены.");
}

async function syncActivityDifficulties(
  activityId: string,
  kind: AdminActivityKind,
  difficultyIds: string[],
) {
  const targetDifficultyIds = uniqueStrings(difficultyIds);

  if (kind !== "RAID") {
    await prisma.activityDifficultyOption.deleteMany({ where: { activityId } });

    return success("Сложности сброшены.");
  }

  if (targetDifficultyIds.length > 0) {
    const difficulties = await prisma.eventDifficultyOption.findMany({
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
      select: { id: true, sortOrder: true },
      where: {
        id: { in: targetDifficultyIds },
        isActive: true,
      },
    });

    if (difficulties.length !== targetDifficultyIds.length) {
      return error("Одна или несколько сложностей не найдены.");
    }

    await prisma.$transaction([
      prisma.activityDifficultyOption.deleteMany({ where: { activityId } }),
      prisma.activityDifficultyOption.createMany({
        data: difficulties.map((difficulty, index) => ({
          activityId,
          difficultyId: difficulty.id,
          sortOrder: difficulty.sortOrder ?? index,
        })),
        skipDuplicates: true,
      }),
    ]);

    return success("Сложности рейда сохранены.");
  }

  await prisma.activityDifficultyOption.deleteMany({ where: { activityId } });

  return success("Сложности рейда сброшены.");
}

export async function saveActivitySheetFormAction(
  formData: FormData,
): Promise<void> {
  const actor = await getAdminActor();
  const kind = getFormString(formData, "kind");

  if (!actor.ok || !isActivityKind(kind)) {
    return;
  }

  const saved = await saveActivityRecord({
    aliases: parseAliases(getFormString(formData, "aliases")),
    artPath: getFormString(formData, "artPath"),
    id: getFormString(formData, "id"),
    isActive: getFormBoolean(formData, "isActive"),
    kind,
    nameEn: getFormString(formData, "nameEn"),
    nameRu: getFormString(formData, "nameRu"),
    shortNameEn: getFormString(formData, "shortNameEn"),
    shortNameRu: getFormString(formData, "shortNameRu"),
    slug: getFormString(formData, "slug"),
    sortOrder: getFormNumber(formData, "sortOrder"),
  });

  if (!saved.ok) {
    return;
  }

  const groupResult = await syncActivityGroupLinks(
    saved.id,
    getFormStringArray(formData, "groupIds"),
    { requireSingleGroup: kind === "DUNGEON" || kind === "RAID" },
  );

  if (groupResult.status === "error") {
    return;
  }

  const difficultyResult = await syncActivityDifficulties(
    saved.id,
    kind,
    getFormStringArray(formData, "difficultyIds"),
  );

  if (difficultyResult.status === "error") {
    return;
  }

  revalidateAdminCatalog();
}

export async function setActivityGroupLinkAction(
  activityId: string,
  groupId: string,
  isLinked: boolean,
): Promise<AdminActionResult> {
  const actor = await getAdminActor();

  if (!actor.ok) {
    return actor.result;
  }

  const targetActivityId = activityId.trim();
  const targetGroupId = groupId.trim();

  if (!targetActivityId || !targetGroupId) {
    return error("Не указаны активность или дополнение.");
  }

  const [activity, group] = await Promise.all([
    prisma.activity.findUnique({
      where: { id: targetActivityId },
      select: { id: true },
    }),
    prisma.activityGroup.findUnique({
      where: { id: targetGroupId },
      select: { id: true },
    }),
  ]);

  if (!activity || !group) {
    return error("Активность или дополнение не найдены.");
  }

  if (isLinked) {
    const sortOrder = await prisma.activityGroupItem.count({
      where: { groupId: targetGroupId },
    });

    await prisma.activityGroupItem.upsert({
      create: {
        activityId: targetActivityId,
        groupId: targetGroupId,
        sortOrder,
      },
      update: {},
      where: {
        groupId_activityId: {
          activityId: targetActivityId,
          groupId: targetGroupId,
        },
      },
    });
  } else {
    await prisma.activityGroupItem.deleteMany({
      where: {
        activityId: targetActivityId,
        groupId: targetGroupId,
      },
    });
  }

  revalidateAdminCatalog();

  return success(isLinked ? "Связь добавлена." : "Связь удалена.");
}

export async function setActivityGroupLinkFormAction(
  formData: FormData,
): Promise<void> {
  await setActivityGroupLinkAction(
    getFormString(formData, "activityId"),
    getFormString(formData, "groupId"),
    getFormBoolean(formData, "isLinked"),
  );
}

export async function setActivityDifficultyOptionsAction(
  activityId: string,
  difficultyIds: string[],
): Promise<AdminActionResult> {
  const actor = await getAdminActor();

  if (!actor.ok) {
    return actor.result;
  }

  const targetActivityId = activityId.trim();
  const targetDifficultyIds = uniqueStrings(difficultyIds);

  if (!targetActivityId) {
    return error("Не указан рейд.");
  }

  if (targetDifficultyIds.length === 0) {
    return error("Выберите хотя бы одну сложность.");
  }

  const activity = await prisma.activity.findUnique({
    where: { id: targetActivityId },
    select: { id: true, kind: true },
  });

  if (!activity) {
    return error("Рейд не найден.");
  }

  if (activity.kind !== "RAID") {
    return error("Сложности можно назначать только рейдам.");
  }

  const difficulties = await prisma.eventDifficultyOption.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    select: { id: true, sortOrder: true },
    where: {
      id: { in: targetDifficultyIds },
      isActive: true,
    },
  });

  if (difficulties.length !== targetDifficultyIds.length) {
    return error("Одна или несколько сложностей не найдены.");
  }

  await prisma.$transaction([
    prisma.activityDifficultyOption.deleteMany({
      where: { activityId: targetActivityId },
    }),
    prisma.activityDifficultyOption.createMany({
      data: difficulties.map((difficulty, index) => ({
        activityId: targetActivityId,
        difficultyId: difficulty.id,
        sortOrder: difficulty.sortOrder ?? index,
      })),
      skipDuplicates: true,
    }),
  ]);

  revalidateAdminCatalog();

  return success("Сложности рейда сохранены.");
}

export async function setActivityDifficultyOptionsFormAction(
  formData: FormData,
): Promise<void> {
  await setActivityDifficultyOptionsAction(
    getFormString(formData, "activityId"),
    formData
      .getAll("difficultyIds")
      .filter((value): value is string => typeof value === "string"),
  );
}

export async function setCatalogItemActiveAction(
  targetType: AdminCatalogTarget,
  id: string,
  isActive: boolean,
): Promise<AdminActionResult> {
  const actor = await getAdminActor();

  if (!actor.ok) {
    return actor.result;
  }

  const targetId = id.trim();

  if (!targetId) {
    return error("Не указан элемент каталога.");
  }

  if (targetType === "activity") {
    await prisma.activity.update({
      where: { id: targetId },
      data: { isActive },
    });
  } else if (targetType === "activityGroup") {
    await prisma.activityGroup.update({
      where: { id: targetId },
      data: { isActive },
    });
  } else {
    await prisma.eventDifficultyOption.update({
      where: { id: targetId },
      data: { isActive },
    });
  }

  revalidateAdminCatalog();

  return success(isActive ? "Элемент включен." : "Элемент выключен.");
}

export async function setCatalogItemActiveFormAction(
  formData: FormData,
): Promise<void> {
  const targetType = getFormString(formData, "targetType");

  if (!isCatalogTarget(targetType)) {
    return;
  }

  await setCatalogItemActiveAction(
    targetType,
    getFormString(formData, "id"),
    getFormBoolean(formData, "isActive"),
  );
}

export async function markWowCharacterCacheStaleAction(
  characterId: string,
  cacheTarget: AdminCacheTarget,
): Promise<AdminActionResult> {
  const actor = await getAdminActor();

  if (!actor.ok) {
    return actor.result;
  }

  const targetId = characterId.trim();

  if (!targetId) {
    return error("Не указан cache-персонаж.");
  }

  const data: {
    lastFetchedAt?: Date;
    raiderIoFetchedAt?: Date;
    blizzardEquipmentFetchedAt?: Date;
  } = {};

  if (cacheTarget === "warcraftLogs" || cacheTarget === "all") {
    data.lastFetchedAt = STALE_CACHE_DATE;
  }

  if (cacheTarget === "raiderIo" || cacheTarget === "all") {
    data.raiderIoFetchedAt = STALE_CACHE_DATE;
  }

  if (cacheTarget === "blizzardEquipment" || cacheTarget === "all") {
    data.blizzardEquipmentFetchedAt = STALE_CACHE_DATE;
  }

  if (Object.keys(data).length === 0) {
    return error("Неизвестная cache-цель.");
  }

  await prisma.wowCharacter.update({
    where: { id: targetId },
    data,
  });

  revalidatePath("/dashboard");

  return success("Cache timestamp устарен.");
}

export async function markWowCharacterCacheStaleFormAction(
  formData: FormData,
): Promise<void> {
  const cacheTarget = getFormString(formData, "cacheTarget");

  if (!isCacheTarget(cacheTarget)) {
    return;
  }

  await markWowCharacterCacheStaleAction(
    getFormString(formData, "characterId"),
    cacheTarget,
  );
}
