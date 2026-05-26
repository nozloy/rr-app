import {
  getBannerDraftFromPageParams,
  getBannerDraftFromUrlParams,
  getBannerImageUrl,
} from "@/lib/banner-params";

describe("banner params", () => {
  it("parses page params into a banner draft", () => {
    expect(
      getBannerDraftFromPageParams(
        {
          characterId: "character-1",
          dungeonSlug: "dungeon-1",
          keystoneLevel: "12",
          tankFilled: "on",
          dpsFilled: "2",
          hasBattleRes: "1",
        },
        {
          characterId: "fallback-character",
          dungeonSlug: "fallback-dungeon",
          raidSlug: "fallback-raid",
        },
      ),
    ).toEqual({
      bannerType: "mythicPlus",
      characterId: "character-1",
      dungeonSlug: "dungeon-1",
      raidSlug: "fallback-raid",
      keystoneLevel: 12,
      tankFilled: true,
      healerFilled: false,
      dpsFilled: 2,
      raidTankNeeded: 0,
      raidHealerNeeded: 0,
      hasBloodlust: false,
      hasBattleRes: true,
    });
  });

  it("builds and parses the stateless image URL", () => {
    const imageUrl = getBannerImageUrl({
      bannerType: "mythicPlus",
      characterId: "character-1",
      dungeonSlug: "dungeon-1",
      raidSlug: "raid-1",
      keystoneLevel: 10,
      tankFilled: true,
      healerFilled: false,
      dpsFilled: 1,
      raidTankNeeded: 0,
      raidHealerNeeded: 0,
      hasBloodlust: true,
      hasBattleRes: false,
    });

    const draft = getBannerDraftFromUrlParams(
      new URL(`http://localhost${imageUrl}`).searchParams,
    );

    expect(draft).toEqual({
      bannerType: "mythicPlus",
      characterId: "character-1",
      dungeonSlug: "dungeon-1",
      raidSlug: "",
      keystoneLevel: 10,
      tankFilled: true,
      healerFilled: false,
      dpsFilled: 1,
      raidTankNeeded: 0,
      raidHealerNeeded: 0,
      hasBloodlust: true,
      hasBattleRes: false,
    });
  });

  it("builds and parses raid image URL params", () => {
    const imageUrl = getBannerImageUrl({
      bannerType: "raid",
      characterId: "character-1",
      dungeonSlug: "dungeon-1",
      raidSlug: "the-voidspire",
      keystoneLevel: 10,
      tankFilled: false,
      healerFilled: false,
      dpsFilled: 0,
      raidTankNeeded: 1,
      raidHealerNeeded: 2,
      hasBloodlust: false,
      hasBattleRes: false,
    });

    const draft = getBannerDraftFromUrlParams(
      new URL(`http://localhost${imageUrl}`).searchParams,
    );

    expect(draft).toMatchObject({
      bannerType: "raid",
      characterId: "character-1",
      raidSlug: "the-voidspire",
      raidTankNeeded: 1,
      raidHealerNeeded: 2,
    });
  });
});
