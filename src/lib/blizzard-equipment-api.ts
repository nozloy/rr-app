import { Prisma, type WowCharacter } from "@prisma/client";
import {
  BlizzardApiRequestError,
  fetchCharacterEquipment,
  getApplicationAccessToken,
  type BlizzardRegion,
} from "@/lib/blizzard-api";
import {
  isBlizzardEquipmentCacheFresh,
  normalizeBlizzardEquipment,
  type BlizzardEquipmentDetailsResult,
  type BlizzardEquipmentItemSummary,
  type BlizzardEquipmentSnapshot,
} from "@/lib/blizzard-equipment-core";
import { prisma } from "@/lib/prisma";
import {
  normalizeWowCharacterKey,
  type WowCharacterKey,
} from "@/lib/warcraftlogs-api";

type BlizzardEquipmentLookupOptions = {
  forceRefresh?: boolean;
};

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function normalizeBlizzardRegion(value: string): BlizzardRegion | null {
  const normalized = value.trim().toLowerCase();

  return normalized === "eu" || normalized === "us" ? normalized : null;
}

async function upsertEmptyWowCharacter(key: WowCharacterKey) {
  const normalizedKey = normalizeWowCharacterKey(key);

  return prisma.wowCharacter.upsert({
    where: {
      name_serverSlug_serverRegion: normalizedKey,
    },
    create: normalizedKey,
    update: {},
  });
}

function getEquipmentSnapshotFromRecord(record: WowCharacter) {
  const value = record.blizzardEquipmentJson;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  if (!("items" in value) && !("itemLevel" in value) && !("topItem" in value)) {
    return null;
  }

  return value as BlizzardEquipmentSnapshot;
}

function getTopItemFromRecord(record: WowCharacter) {
  const value = record.blizzardTopItemJson;

  if (!value || typeof value !== "object" || Array.isArray(value) || !("name" in value)) {
    return null;
  }

  return value as BlizzardEquipmentItemSummary;
}

function recordToBlizzardEquipmentDetails(
  record: WowCharacter,
  message: string | null = null,
): BlizzardEquipmentDetailsResult {
  const snapshot = getEquipmentSnapshotFromRecord(record);
  const topItem = snapshot?.topItem ?? getTopItemFromRecord(record);
  const itemLevel = record.blizzardEquippedItemLevel ?? snapshot?.itemLevel ?? null;
  const hasEquipment = Boolean(snapshot) || itemLevel !== null;

  return {
    status: hasEquipment ? "ready" : "not_found",
    message,
    lastFetchedAt: record.blizzardEquipmentFetchedAt?.toISOString() ?? null,
    itemLevel,
    topItem,
    items: snapshot?.items ?? [],
  };
}

function emptyBlizzardEquipmentDetails({
  message,
  status,
}: {
  message: string | null;
  status: BlizzardEquipmentDetailsResult["status"];
}): BlizzardEquipmentDetailsResult {
  return {
    status,
    message,
    lastFetchedAt: null,
    itemLevel: null,
    topItem: null,
    items: [],
  };
}

export async function refreshBlizzardEquipmentDetails(key: WowCharacterKey) {
  const normalizedKey = normalizeWowCharacterKey(key);
  const region = normalizeBlizzardRegion(normalizedKey.serverRegion);

  if (!region) {
    throw new Error("Unsupported Blizzard region.");
  }

  await upsertEmptyWowCharacter(normalizedKey);
  const fetchedAt = new Date();

  try {
    const accessToken = await getApplicationAccessToken(region);
    const equipment = await fetchCharacterEquipment(
      accessToken,
      normalizedKey.serverSlug,
      normalizedKey.name,
      region,
    );
    const snapshot = normalizeBlizzardEquipment(equipment);

    return prisma.wowCharacter.update({
      where: {
        name_serverSlug_serverRegion: normalizedKey,
      },
      data: {
        blizzardEquipmentJson: snapshot ? toJsonValue(snapshot) : Prisma.JsonNull,
        blizzardEquippedItemLevel: snapshot?.itemLevel ?? null,
        blizzardTopItemJson: snapshot?.topItem
          ? toJsonValue(snapshot.topItem)
          : Prisma.JsonNull,
        blizzardEquipmentFetchedAt: fetchedAt,
      },
    });
  } catch (error) {
    if (error instanceof BlizzardApiRequestError && error.status === 404) {
      return prisma.wowCharacter.update({
        where: {
          name_serverSlug_serverRegion: normalizedKey,
        },
        data: {
          blizzardEquipmentJson: Prisma.JsonNull,
          blizzardEquippedItemLevel: null,
          blizzardTopItemJson: Prisma.JsonNull,
          blizzardEquipmentFetchedAt: fetchedAt,
        },
      });
    }

    throw error;
  }
}

export async function getBlizzardEquipmentDetails(
  key: WowCharacterKey,
  options: BlizzardEquipmentLookupOptions = {},
): Promise<BlizzardEquipmentDetailsResult> {
  const normalizedKey = normalizeWowCharacterKey(key);

  if (!normalizedKey.name || !normalizedKey.serverSlug || !normalizedKey.serverRegion) {
    return emptyBlizzardEquipmentDetails({
      status: "error",
      message: "Missing character name, server slug, or region.",
    });
  }

  const existing = await prisma.wowCharacter.findUnique({
    where: {
      name_serverSlug_serverRegion: normalizedKey,
    },
  });

  if (
    !options.forceRefresh &&
    existing &&
    isBlizzardEquipmentCacheFresh(existing.blizzardEquipmentFetchedAt)
  ) {
    return recordToBlizzardEquipmentDetails(existing);
  }

  try {
    const refreshed = await refreshBlizzardEquipmentDetails(normalizedKey);
    return recordToBlizzardEquipmentDetails(refreshed);
  } catch (error) {
    if (existing?.blizzardEquipmentFetchedAt) {
      return recordToBlizzardEquipmentDetails(
        existing,
        error instanceof Error
          ? error.message
          : "Blizzard equipment refresh failed.",
      );
    }

    return emptyBlizzardEquipmentDetails({
      status: "error",
      message:
        error instanceof Error ? error.message : "Blizzard equipment refresh failed.",
    });
  }
}

export type { BlizzardEquipmentDetailsResult };
