import type { BlizzardEquipmentSummary } from "@/lib/blizzard-mappers";

export const BLIZZARD_EQUIPMENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type BlizzardEquipmentItemSummary = {
  id: number | null;
  name: string;
  slot: string | null;
  itemLevel: number | null;
  quality: string | null;
};

export type BlizzardEquipmentSnapshot = {
  itemLevel: number | null;
  topItem: BlizzardEquipmentItemSummary | null;
  items: BlizzardEquipmentItemSummary[];
};

export type BlizzardEquipmentDetailsResult = {
  status: "ready" | "not_found" | "error";
  message: string | null;
  lastFetchedAt: string | null;
  itemLevel: number | null;
  topItem: BlizzardEquipmentItemSummary | null;
  items: BlizzardEquipmentItemSummary[];
};

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getTopItem(items: BlizzardEquipmentItemSummary[]) {
  return (
    items
      .filter((item) => item.itemLevel !== null)
      .sort((left, right) => (right.itemLevel ?? 0) - (left.itemLevel ?? 0))[0] ??
    null
  );
}

export function normalizeBlizzardEquipment(
  equipment: BlizzardEquipmentSummary | null,
): BlizzardEquipmentSnapshot | null {
  if (!equipment) {
    return null;
  }

  const items = (equipment.equipped_items ?? [])
    .map((item) => {
      const name = getString(item.item?.name) ?? getString(item.name);

      if (!name) {
        return null;
      }

      return {
        id: getNumber(item.item?.id),
        name,
        slot: getString(item.slot?.name) ?? getString(item.slot?.type),
        itemLevel: getNumber(item.level?.value) ?? getNumber(item.item_level),
        quality: getString(item.quality?.name) ?? getString(item.quality?.type),
      } satisfies BlizzardEquipmentItemSummary;
    })
    .filter((item): item is BlizzardEquipmentItemSummary => item !== null);

  return {
    itemLevel: getNumber(equipment.equipped_item_level),
    topItem: getTopItem(items),
    items,
  };
}

export function isBlizzardEquipmentCacheFresh(
  lastFetchedAt: Date | string | null | undefined,
  now = new Date(),
) {
  if (!lastFetchedAt) {
    return false;
  }

  const fetchedAt =
    lastFetchedAt instanceof Date ? lastFetchedAt : new Date(lastFetchedAt);

  if (Number.isNaN(fetchedAt.getTime())) {
    return false;
  }

  return now.getTime() - fetchedAt.getTime() < BLIZZARD_EQUIPMENT_CACHE_TTL_MS;
}
