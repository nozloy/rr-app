import { mapBlizzardCharacterToNormalized } from "@/lib/blizzard-mappers";

describe("mapBlizzardCharacterToNormalized", () => {
  it("maps localized battle.net payloads into database shape", () => {
    const result = mapBlizzardCharacterToNormalized(
      {
        id: 101,
        name: "Aeloria",
        level: 90,
        realm: { slug: "howling-fjord", name: "Ревущий фьорд" },
        playable_class: { name: "Жрец" },
        playable_race: { name: "Эльф крови" },
        faction: { name: "Орда" },
        active_spec: { name: "Послушание" },
      },
      {
        realm: { slug: "howling-fjord", name: "Ревущий фьорд" },
        character_class: { name: "Жрец" },
        playable_race: { name: "Эльф крови" },
        faction: { name: "Орда" },
        active_specialization: { name: "Послушание" },
      },
      {
        equipped_item_level: 672,
      },
      {
        assets: [
          { key: "avatar", value: "https://render.worldofwarcraft.com/avatar.jpg" },
          { key: "inset", value: "https://render.worldofwarcraft.com/inset.jpg" },
        ],
      },
    );

    expect(result.characterId).toBe(BigInt(101));
    expect(result.name).toBe("Aeloria");
    expect(result.className).toBe("Жрец");
    expect(result.itemLevel).toBe(672);
    expect(result.avatarUrl).toContain("avatar.jpg");
    expect(result.thumbnailUrl).toContain("inset.jpg");
  });
});
