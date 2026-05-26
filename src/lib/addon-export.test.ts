import {
  ADDON_EXPORT_PREFIX,
  ADDON_QR_EXPORT_PREFIX,
  AddonExportParseError,
  getImportedRaidDisplayMode,
  getImportedBannerDraftFromExport,
  getImportedBannerImageUrl,
  parseAddonExportString,
} from "@/lib/addon-export";

function makeExport(params: Record<string, string>) {
  return `${ADDON_EXPORT_PREFIX}${new URLSearchParams(params).toString()}`;
}

function makeQrExport(params: Record<string, string>) {
  return `${ADDON_QR_EXPORT_PREFIX}${new URLSearchParams(params).toString()}`;
}

describe("addon export", () => {
  it("parses a valid export string with cyrillic values", () => {
    const parsed = parseAddonExportString(
      makeExport({
        name: "Фунфырка",
        realm: "Ревущий фьорд",
        classFile: "MAGE",
        className: "Маг",
        spec: "Огонь",
        ilvl: "672",
        groupType: "party",
        groupSize: "5",
        members: "MAGE:DAMAGER,DRUID:HEALER,DEATHKNIGHT:TANK",
        keyLevel: "12",
        keyMapName: "Терраса Магистров",
      }),
    );

    expect(parsed.playerName).toBe("Фунфырка");
    expect(parsed.realm).toBe("Ревущий фьорд");
    expect(parsed.className).toBe("Маг");
    expect(parsed.spec).toBe("Огонь");
    expect(parsed.keyLevel).toBe(12);

    const draft = getImportedBannerDraftFromExport(parsed);
    expect(draft.hasBloodlust).toBe(true);
    expect(draft.hasBattleRes).toBe(true);
  });

  it("converts party members into filled role slots without member names", () => {
    const parsed = parseAddonExportString(
      makeExport({
        name: "Aeloria",
        realm: "Howling Fjord",
        classFile: "WARRIOR",
        groupType: "party",
        groupSize: "5",
        members:
          "WARRIOR:TANK,PRIEST:HEALER,MAGE:DAMAGER,HUNTER:DAMAGER,ROGUE:DAMAGER",
      }),
    );

    expect(parsed.members).toEqual([
      { classFile: "WARRIOR", role: "TANK" },
      { classFile: "PRIEST", role: "HEALER" },
      { classFile: "MAGE", role: "DAMAGER" },
      { classFile: "HUNTER", role: "DAMAGER" },
      { classFile: "ROGUE", role: "DAMAGER" },
    ]);

    const draft = getImportedBannerDraftFromExport(parsed);
    expect(draft.tankFilled).toBe(true);
    expect(draft.healerFilled).toBe(true);
    expect(draft.dpsFilled).toBe(3);
  });

  it("parses full raid roster while keeping legacy members", () => {
    const parsed = parseAddonExportString(
      makeExport({
        name: "Mender",
        realm: "Howling Fjord",
        classFile: "PALADIN",
        groupType: "raid",
        groupSize: "3",
        members: "PALADIN:TANK,SHAMAN:HEALER,WARLOCK:DAMAGER",
        roster:
          "Mender:Howling Fjord:PALADIN:TANK,Totemic:Ревущий фьорд:SHAMAN:HEALER,Dotter:Draenor:WARLOCK:DAMAGER",
      }),
    );

    expect(parsed.members).toHaveLength(3);
    expect(parsed.roster).toEqual([
      {
        name: "Mender",
        realm: "Howling Fjord",
        classFile: "PALADIN",
        role: "TANK",
      },
      {
        name: "Totemic",
        realm: "Ревущий фьорд",
        classFile: "SHAMAN",
        role: "HEALER",
      },
      {
        name: "Dotter",
        realm: "Draenor",
        classFile: "WARLOCK",
        role: "DAMAGER",
      },
    ]);
  });

  it("keeps old addon exports valid without full roster", () => {
    const parsed = parseAddonExportString(
      makeExport({
        name: "Aeloria",
        realm: "Howling Fjord",
        classFile: "MAGE",
        groupType: "raid",
        groupSize: "20",
        members: "MAGE:DAMAGER",
      }),
    );

    expect(parsed.roster).toEqual([]);
  });

  it("parses raid context and selected raid difficulty", () => {
    const parsed = parseAddonExportString(
      makeExport({
        name: "Mender",
        raidLeaderName: "Raidboss",
        realm: "Howling Fjord",
        classFile: "PALADIN",
        groupType: "raid",
        groupSize: "20",
        members: "PALADIN:TANK,SHAMAN:HEALER,WARLOCK:DAMAGER",
        instanceType: "raid",
        instanceName: "Manaforge Omega",
        difficultyID: "15",
        difficultyName: "Heroic",
        selectedRaidDifficultyID: "16",
        selectedRaidDifficultyName: "Mythic",
      }),
    );

    expect(parsed.groupType).toBe("raid");
    expect(parsed.playerName).toBe("Mender");
    expect(parsed.raidLeaderName).toBe("Raidboss");
    expect(parsed.groupSize).toBe(20);
    expect(parsed.instanceType).toBe("raid");
    expect(parsed.difficultyName).toBe("Heroic");
    expect(parsed.selectedRaidDifficultyName).toBe("Mythic");

    const draft = getImportedBannerDraftFromExport(parsed);
    expect(draft.characterName).toBe("Raidboss");
    expect(draft.raidTankNeeded).toBe(0);
    expect(draft.raidHealerNeeded).toBe(0);

    const imageUrl = getImportedBannerImageUrl(draft);
    const data = new URL(`http://localhost${imageUrl}`).searchParams.get("data");
    const roundTrip = parseAddonExportString(data ?? "");
    expect(roundTrip.playerName).toBe("Mender");
    expect(roundTrip.raidLeaderName).toBe("Raidboss");
    expect(getImportedBannerDraftFromExport(roundTrip)).toMatchObject({
      characterName: "Raidboss",
      raidTankNeeded: 0,
      raidHealerNeeded: 0,
    });
  });

  it("resolves known legacy raid imports as collection runs with display art", () => {
    const parsed = parseAddonExportString(
      makeExport({
        name: "Mender",
        raidLeaderName: "Raidboss",
        realm: "Howling Fjord",
        classFile: "PALADIN",
        groupType: "raid",
        groupSize: "10",
        members: "PALADIN:TANK,SHAMAN:HEALER,WARLOCK:DAMAGER",
        instanceType: "raid",
        instanceName: "Icecrown Citadel",
        raidTankNeeded: "2",
        raidHealerNeeded: "4",
      }),
    );

    const draft = getImportedBannerDraftFromExport(parsed);
    const displayMode = getImportedRaidDisplayMode(draft);
    const imageUrl = getImportedBannerImageUrl(draft);

    expect(draft.characterName).toBe("Raidboss");
    expect(draft.hasMythicPlusKey).toBe(false);
    expect(displayMode.bannerVariant).toBe("legacyRaid");
    expect(displayMode.isLegacyRaid).toBe(true);
    expect(displayMode.raid).toBeNull();
    expect(displayMode.displayRaid?.slug).toBe("icecrown-citadel");
    expect(displayMode.displayRaid?.artPath).toBe(
      "/raids/icecrown_citadel_styled_16x9.jpg",
    );
    expect(displayMode.activityName).toBe("Icecrown Citadel");
    expect(imageUrl).toContain("/banners/import/image?data=");
  });

  it("keeps truly unknown raid imports on the neutral legacy fallback", () => {
    const parsed = parseAddonExportString(
      makeExport({
        name: "Mender",
        raidLeaderName: "Raidboss",
        realm: "Howling Fjord",
        classFile: "PALADIN",
        groupType: "raid",
        groupSize: "10",
        instanceType: "raid",
        instanceName: "Totally Made Up Keep",
      }),
    );

    const displayMode = getImportedRaidDisplayMode(
      getImportedBannerDraftFromExport(parsed),
    );

    expect(displayMode.bannerVariant).toBe("legacyRaid");
    expect(displayMode.raid).toBeNull();
    expect(displayMode.displayRaid).toBeNull();
    expect(displayMode.activityName).toBe("Totally Made Up Keep");
  });

  it("resolves current Midnight raids as current raid banners", () => {
    const parsed = parseAddonExportString(
      makeExport({
        name: "Mender",
        raidLeaderName: "Raidboss",
        realm: "Howling Fjord",
        classFile: "PALADIN",
        groupType: "raid",
        groupSize: "20",
        members: "PALADIN:TANK,SHAMAN:HEALER,WARLOCK:DAMAGER",
        instanceType: "raid",
        instanceName: "The Voidspire",
        raidTankNeeded: "1",
        raidHealerNeeded: "2",
      }),
    );

    const draft = getImportedBannerDraftFromExport(parsed);
    const displayMode = getImportedRaidDisplayMode(draft);

    expect(draft.raidTankNeeded).toBe(1);
    expect(draft.raidHealerNeeded).toBe(2);
    expect(displayMode.bannerVariant).toBe("currentRaid");
    expect(displayMode.isLegacyRaid).toBe(false);
    expect(displayMode.raid?.slug).toBe("the-voidspire");
    expect(displayMode.displayRaid?.slug).toBe("the-voidspire");
  });

  it("parses compact QR export with cyrillic values", () => {
    const parsed = parseAddonExportString(
      makeQrExport({
        n: "Фунфырка",
        r: "Ревущий фьорд",
        c: "M",
        cl: "Маг",
        s: "Огонь",
        i: "672",
        g: "p",
        z: "5",
        m: "M:D,D:H,DK:T,H:D",
        kl: "12",
        kn: "Терраса Магистров",
      }),
    );

    expect(parsed.playerName).toBe("Фунфырка");
    expect(parsed.realm).toBe("Ревущий фьорд");
    expect(parsed.classFile).toBe("MAGE");
    expect(parsed.className).toBe("Маг");
    expect(parsed.spec).toBe("Огонь");
    expect(parsed.groupType).toBe("party");
    expect(parsed.keyLevel).toBe(12);
    expect(parsed.members).toEqual([
      { classFile: "MAGE", role: "DAMAGER" },
      { classFile: "DRUID", role: "HEALER" },
      { classFile: "DEATHKNIGHT", role: "TANK" },
      { classFile: "HUNTER", role: "DAMAGER" },
    ]);
    expect(parsed.roster).toEqual([]);

    const draft = getImportedBannerDraftFromExport(parsed);
    expect(draft.characterName).toBe("Фунфырка");
    expect(draft.tankFilled).toBe(true);
    expect(draft.healerFilled).toBe(true);
    expect(draft.dpsFilled).toBe(2);
    expect(draft.hasBloodlust).toBe(true);
    expect(draft.hasBattleRes).toBe(true);
  });

  it("parses compact QR raid payload", () => {
    const parsed = parseAddonExportString(
      makeQrExport({
        n: "Mender",
        l: "Raidboss",
        r: "Howling Fjord",
        c: "P",
        g: "r",
        z: "20",
        m: "P:T,S:H,WL:D",
        t: "r",
        in: "Manaforge Omega",
        di: "15",
        dn: "Heroic",
        sr: "16",
        sn: "Mythic",
      }),
    );

    expect(parsed.groupType).toBe("raid");
    expect(parsed.raidLeaderName).toBe("Raidboss");
    expect(parsed.instanceType).toBe("raid");
    expect(parsed.difficultyID).toBe(15);
    expect(parsed.selectedRaidDifficultyID).toBe(16);
    expect(parsed.members).toEqual([
      { classFile: "PALADIN", role: "TANK" },
      { classFile: "SHAMAN", role: "HEALER" },
      { classFile: "WARLOCK", role: "DAMAGER" },
    ]);
    expect(getImportedBannerDraftFromExport(parsed).characterName).toBe(
      "Raidboss",
    );
  });

  it("handles missing key and instance data", () => {
    const parsed = parseAddonExportString(
      makeExport({
        name: "Solo",
        realm: "Howling Fjord",
        classFile: "MAGE",
        groupType: "solo",
        groupSize: "1",
        members: "MAGE:DAMAGER",
      }),
    );

    const draft = getImportedBannerDraftFromExport(parsed);
    expect(parsed.keyLevel).toBeNull();
    expect(parsed.instanceType).toBeNull();
    expect(draft.hasMythicPlusKey).toBe(false);
  });

  it("applies web draft overrides and round-trips image data", () => {
    const parsed = parseAddonExportString(
      makeExport({
        name: "Aeloria",
        realm: "Howling Fjord",
        classFile: "DRUID",
        className: "Druid",
        dungeonSlug: "skyreach",
        keyLevel: "14",
        tankFilled: "0",
        healerFilled: "1",
        dpsFilled: "2",
        raidTankNeeded: "0",
        raidHealerNeeded: "0",
        hasBloodlust: "0",
        hasBattleRes: "1",
      }),
    );
    const draft = getImportedBannerDraftFromExport(parsed);

    expect(draft.dungeonSlug).toBe("skyreach");
    expect(draft.tankFilled).toBe(false);
    expect(draft.healerFilled).toBe(true);
    expect(draft.dpsFilled).toBe(2);
    expect(draft.raidTankNeeded).toBe(0);
    expect(draft.raidHealerNeeded).toBe(0);
    expect(draft.hasBloodlust).toBe(false);
    expect(draft.hasBattleRes).toBe(true);

    const imageUrl = getImportedBannerImageUrl(draft);
    const data = new URL(`http://localhost${imageUrl}`).searchParams.get("data");
    expect(data).toBeTruthy();
    const roundTrip = getImportedBannerDraftFromExport(
      parseAddonExportString(data ?? ""),
    );
    expect(parseAddonExportString(data ?? "").keyLevel).toBe(14);
    expect(roundTrip.raidTankNeeded).toBe(0);
    expect(roundTrip.raidHealerNeeded).toBe(0);
  });

  it("rejects bad or oversized export strings", () => {
    expect(() => parseAddonExportString("RIO?name=Aeloria")).toThrow(
      AddonExportParseError,
    );
    expect(() =>
      parseAddonExportString(makeQrExport({ n: "Aeloria", r: "Howling Fjord" })),
    ).toThrow("В строке экспорта нет поля c.");
    expect(() =>
      parseAddonExportString(`${ADDON_EXPORT_PREFIX}${"x".repeat(13000)}`),
    ).toThrow("Строка экспорта слишком длинная.");
  });
});
