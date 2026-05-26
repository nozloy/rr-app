import {
  getRaidArmorSummary,
  getRaidClassNeedsLabel,
  getRaidCompositionAnalysis,
  getRaidRecruitmentNeedsLabel,
  isMythicRaid,
} from "@/lib/raid-composition";
import type { AddonExportData } from "@/lib/addon-export";

function makeRaidExport(
  patch: Partial<AddonExportData> = {},
): Pick<
  AddonExportData,
  | "difficultyID"
  | "difficultyName"
  | "groupSize"
  | "members"
  | "selectedRaidDifficultyID"
  | "selectedRaidDifficultyName"
> {
  return {
    difficultyID: 16,
    difficultyName: "Mythic",
    groupSize: 20,
    members: [
      { classFile: "MAGE", role: "DAMAGER" },
      { classFile: "DRUID", role: "HEALER" },
      { classFile: "DEATHKNIGHT", role: "TANK" },
      { classFile: "HUNTER", role: "DAMAGER" },
      { classFile: "WARLOCK", role: "DAMAGER" },
    ],
    selectedRaidDifficultyID: null,
    selectedRaidDifficultyName: null,
    ...patch,
  };
}

describe("raid composition", () => {
  it("counts all armor types including zero values", () => {
    const analysis = getRaidCompositionAnalysis(
      makeRaidExport({
        members: [
          { classFile: "MAGE", role: "DAMAGER" },
          { classFile: "PRIEST", role: "HEALER" },
          { classFile: "WARRIOR", role: "TANK" },
        ],
      }),
    );

    expect(analysis.armorCounts).toEqual([
      { key: "cloth", label: "Ткань", count: 2 },
      { key: "leather", label: "Кожа", count: 0 },
      { key: "mail", label: "Кольчуга", count: 0 },
      { key: "plate", label: "Латы", count: 1 },
    ]);
    expect(getRaidArmorSummary(analysis)).toBe(
      "Ткань: 2 • Кожа: 0 • Кольчуга: 0 • Латы: 1",
    );
  });

  it("applies mythic class rules to every mythic raid", () => {
    const analysis = getRaidCompositionAnalysis(makeRaidExport());

    expect(getRaidClassNeedsLabel(analysis)).toBe(
      "Нужны: Рыцарь смерти x1 • Воин x2 (Боевой крик) • Охотник на демонов x1 (Печать хаоса) • Паладин x1 (Аура благочестия) • Монах x1 (Таинственное касание) • Жрец x1 (Стойкость) • Шаман x1 (Небесная ярость)",
    );
  });

  it("formats manual raid role needs before class and buff needs", () => {
    const analysis = getRaidCompositionAnalysis(makeRaidExport());

    expect(
      getRaidRecruitmentNeedsLabel({
        roleNeeds: { tankNeeded: 1, healerNeeded: 2 },
        analysis,
      }),
    ).toBe(
      "Нужны: Танк x1 • Хил x2 • Рыцарь смерти x1 • Воин x2 (Боевой крик) • Охотник на демонов x1 (Печать хаоса) • Паладин x1 (Аура благочестия) • Монах x1 (Таинственное касание) • Жрец x1 (Стойкость) • Шаман x1 (Небесная ярость)",
    );
  });

  it("does not infer missing tanks from imported raid composition", () => {
    const analysis = getRaidCompositionAnalysis(
      makeRaidExport({
        difficultyID: 15,
        difficultyName: "Heroic",
        members: [
          { classFile: "MAGE", role: "DAMAGER" },
          { classFile: "WARRIOR", role: "TANK" },
          { classFile: "DEMONHUNTER", role: "DAMAGER" },
          { classFile: "PALADIN", role: "HEALER" },
          { classFile: "HUNTER", role: "DAMAGER" },
          { classFile: "DRUID", role: "HEALER" },
          { classFile: "MONK", role: "DAMAGER" },
          { classFile: "PRIEST", role: "HEALER" },
          { classFile: "SHAMAN", role: "DAMAGER" },
        ],
      }),
    );

    expect(
      getRaidRecruitmentNeedsLabel({
        roleNeeds: { tankNeeded: 0, healerNeeded: 0 },
        analysis,
      }),
    ).toBe("Роли и бафы закрыты");
  });

  it("uses missing raid buffs for class needs outside mythic difficulty", () => {
    const analysis = getRaidCompositionAnalysis(
      makeRaidExport({
        difficultyID: 15,
        difficultyName: "Heroic",
      }),
    );

    expect(analysis.classNeeds.map((need) => need.classFile)).toEqual([
      "WARRIOR",
      "DEMONHUNTER",
      "PALADIN",
      "MONK",
      "PRIEST",
      "SHAMAN",
    ]);
    expect(getRaidClassNeedsLabel(analysis)).toBe(
      "Нужны: Воин x1 (Боевой крик) • Охотник на демонов x1 (Печать хаоса) • Паладин x1 (Аура благочестия) • Монах x1 (Таинственное касание) • Жрец x1 (Стойкость) • Шаман x1 (Небесная ярость)",
    );
  });

  it("marks missing raid buffs by provider class", () => {
    const analysis = getRaidCompositionAnalysis(makeRaidExport());

    expect(analysis.missingBuffs.map((buff) => buff.key)).toEqual([
      "battle-shout",
      "chaos-brand",
      "devotion-aura",
      "mystic-touch",
      "power-word-fortitude",
      "skyfury",
    ]);
    expect(
      analysis.missingBuffs.some((buff) => buff.key === "mark-of-the-wild"),
    ).toBe(false);
    expect(
      analysis.missingBuffs.some((buff) => buff.key === "arcane-intellect"),
    ).toBe(false);
    expect(
      analysis.classNeeds.find((need) => need.classFile === "WARRIOR")?.reasons,
    ).toEqual(["Боевой крик"]);
  });

  it("falls back to role summary when no class or buff needs remain", () => {
    const analysis = getRaidCompositionAnalysis(
      makeRaidExport({
        difficultyID: 15,
        difficultyName: "Heroic",
        members: [
          { classFile: "MAGE", role: "DAMAGER" },
          { classFile: "WARRIOR", role: "TANK" },
          { classFile: "DEMONHUNTER", role: "DAMAGER" },
          { classFile: "PALADIN", role: "HEALER" },
          { classFile: "HUNTER", role: "DAMAGER" },
          { classFile: "DRUID", role: "HEALER" },
          { classFile: "MONK", role: "DAMAGER" },
          { classFile: "PRIEST", role: "HEALER" },
          { classFile: "SHAMAN", role: "DAMAGER" },
        ],
      }),
    );

    expect(analysis.classNeeds).toEqual([]);
    expect(getRaidClassNeedsLabel(analysis)).toBe(
      "Танки: 1 • Хилы: 3 • ДД: 5",
    );
  });

  it("detects mythic from selected raid difficulty", () => {
    expect(
      isMythicRaid({
        difficultyID: 14,
        difficultyName: "Normal",
        selectedRaidDifficultyID: 16,
        selectedRaidDifficultyName: "Mythic",
      }),
    ).toBe(true);
  });
});
