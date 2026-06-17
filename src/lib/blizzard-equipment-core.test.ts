import {
  isBlizzardEquipmentCacheFresh,
  normalizeBlizzardEquipment,
} from "@/lib/blizzard-equipment-core";
import { describe, expect, it } from "vitest";

describe("blizzard equipment core", () => {
  it("normalizes equipped item level and top item", () => {
    const result = normalizeBlizzardEquipment({
      equipped_item_level: 710,
      equipped_items: [
        {
          item: { id: 1, name: "Arcane Blade" },
          slot: { name: "Main Hand" },
          quality: { name: "Epic" },
          level: { value: 720 },
        },
        {
          item: { id: 2, name: "Quiet Ring" },
          slot: { type: "FINGER_1" },
          quality: { type: "RARE" },
          level: { value: 704 },
        },
      ],
    });

    expect(result).toMatchObject({
      itemLevel: 710,
      topItem: { name: "Arcane Blade", itemLevel: 720 },
      items: [
        { id: 1, name: "Arcane Blade", slot: "Main Hand", quality: "Epic" },
        { id: 2, name: "Quiet Ring", slot: "FINGER_1", quality: "RARE" },
      ],
    });
  });

  it("checks cache freshness with a 24 hour ttl", () => {
    const now = new Date("2026-06-17T12:00:00.000Z");

    expect(isBlizzardEquipmentCacheFresh("2026-06-17T11:30:00.000Z", now)).toBe(true);
    expect(isBlizzardEquipmentCacheFresh("2026-06-15T11:30:00.000Z", now)).toBe(false);
    expect(isBlizzardEquipmentCacheFresh(null, now)).toBe(false);
  });
});
