export type BlizzardReference = {
  id?: number;
  name?: string;
  slug?: string;
  type?: string;
};

export type BlizzardCharacterSummary = {
  id: number;
  name: string;
  level: number;
  realm?: BlizzardReference;
  playable_class?: BlizzardReference;
  character_class?: BlizzardReference;
  playable_race?: BlizzardReference;
  faction?: BlizzardReference;
  active_spec?: BlizzardReference | null;
  active_specialization?: BlizzardReference | null;
};

export type BlizzardCharacterProfile = {
  id?: number;
  name?: string;
  level?: number;
  realm?: BlizzardReference;
  playable_class?: BlizzardReference;
  character_class?: BlizzardReference;
  playable_race?: BlizzardReference;
  faction?: BlizzardReference;
  active_spec?: BlizzardReference | null;
  active_specialization?: BlizzardReference | null;
};

export type BlizzardEquipmentItem = {
  item?: {
    id?: number;
    name?: string;
  };
  slot?: BlizzardReference;
  quality?: BlizzardReference;
  level?: {
    value?: number;
    display_string?: string;
  };
  item_level?: number;
  name?: string;
};

export type BlizzardEquipmentSummary = {
  equipped_item_level?: number;
  equipped_items?: BlizzardEquipmentItem[];
};

export type BlizzardCharacterMedia = {
  assets?: Array<{
    key: string;
    value: string;
  }>;
};

export type NormalizedCharacter = {
  characterId: bigint;
  name: string;
  realm: string;
  realmSlug: string;
  className: string;
  raceName: string;
  factionName: string;
  level: number;
  activeSpec: string | null;
  itemLevel: number;
  thumbnailUrl: string | null;
  avatarUrl: string | null;
};

function resolveAsset(
  media: BlizzardCharacterMedia | null,
  keys: string[],
): string | null {
  if (!media?.assets) {
    return null;
  }

  for (const key of keys) {
    const asset = media.assets.find((item) => item.key === key);

    if (asset) {
      return asset.value;
    }
  }

  return null;
}

export function mapBlizzardCharacterToNormalized(
  summary: BlizzardCharacterSummary,
  profile: BlizzardCharacterProfile | null,
  equipment: BlizzardEquipmentSummary | null,
  media: BlizzardCharacterMedia | null,
): NormalizedCharacter {
  return {
    characterId: BigInt(profile?.id ?? summary.id),
    name: profile?.name ?? summary.name,
    realm: profile?.realm?.name ?? summary.realm?.name ?? "Неизвестный мир",
    realmSlug: profile?.realm?.slug ?? summary.realm?.slug ?? "unknown",
    className:
      profile?.character_class?.name ??
      profile?.playable_class?.name ??
      summary.character_class?.name ??
      summary.playable_class?.name ??
      "Неизвестный класс",
    raceName:
      profile?.playable_race?.name ??
      summary.playable_race?.name ??
      "Неизвестная раса",
    factionName:
      profile?.faction?.name ??
      summary.faction?.name ??
      profile?.faction?.type ??
      summary.faction?.type ??
      "Неизвестная фракция",
    level: profile?.level ?? summary.level,
    activeSpec:
      profile?.active_spec?.name ??
      profile?.active_specialization?.name ??
      summary.active_spec?.name ??
      summary.active_specialization?.name ??
      null,
    itemLevel: equipment?.equipped_item_level ?? 0,
    thumbnailUrl: resolveAsset(media, ["inset", "avatar", "main-raw"]),
    avatarUrl: resolveAsset(media, ["avatar", "main-raw", "inset"]),
  };
}
