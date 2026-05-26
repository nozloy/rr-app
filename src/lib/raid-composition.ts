import type { AddonExportData, AddonGroupMember } from "@/lib/addon-export";

export type RaidArmorKey = "cloth" | "leather" | "mail" | "plate";

export type RaidArmorCount = {
  key: RaidArmorKey;
  label: string;
  count: number;
};

export type RaidClassNeed = {
  classFile: string;
  label: string;
  current: number;
  target: number;
  missing: number;
  reasons: string[];
};

export type RaidBuffNeed = {
  key: string;
  label: string;
  iconPath: string;
  providerClasses: string[];
};

export type RaidCompositionAnalysis = {
  armorCounts: RaidArmorCount[];
  classNeeds: RaidClassNeed[];
  missingBuffs: RaidBuffNeed[];
  isMythic: boolean;
  roleSummary: string;
};

export type RaidRoleNeeds = {
  tankNeeded: number;
  healerNeeded: number;
};

const ARMOR_ORDER: RaidArmorKey[] = ["cloth", "leather", "mail", "plate"];

const ARMOR_LABELS: Record<RaidArmorKey, string> = {
  cloth: "Ткань",
  leather: "Кожа",
  mail: "Кольчуга",
  plate: "Латы",
};

const CLASS_ARMOR: Record<string, RaidArmorKey> = {
  DEATHKNIGHT: "plate",
  DEMONHUNTER: "leather",
  DRUID: "leather",
  EVOKER: "mail",
  HUNTER: "mail",
  MAGE: "cloth",
  MONK: "leather",
  PALADIN: "plate",
  PRIEST: "cloth",
  ROGUE: "leather",
  SHAMAN: "mail",
  WARLOCK: "cloth",
  WARRIOR: "plate",
};

const CLASS_LABELS: Record<string, string> = {
  DEATHKNIGHT: "Рыцарь смерти",
  DEMONHUNTER: "Охотник на демонов",
  DRUID: "Друид",
  EVOKER: "Пробудитель",
  HUNTER: "Охотник",
  MAGE: "Маг",
  MONK: "Монах",
  PALADIN: "Паладин",
  PRIEST: "Жрец",
  ROGUE: "Разбойник",
  SHAMAN: "Шаман",
  WARLOCK: "Чернокнижник",
  WARRIOR: "Воин",
};

const MYTHIC_CLASS_RULES = [
  { classFile: "DEATHKNIGHT", target: 2 },
  { classFile: "WARRIOR", target: 2 },
  { classFile: "WARLOCK", target: 1 },
] as const;

export const RAID_BUFFS: RaidBuffNeed[] = [
  {
    key: "arcane-intellect",
    label: "Интеллект",
    iconPath: "/raid_buffs/Arcane_Intellect.jpg",
    providerClasses: ["MAGE"],
  },
  {
    key: "battle-shout",
    label: "Боевой крик",
    iconPath: "/raid_buffs/battleshout.jpg",
    providerClasses: ["WARRIOR"],
  },
  {
    key: "chaos-brand",
    label: "Печать хаоса",
    iconPath: "/raid_buffs/ChaosBrand.jpg",
    providerClasses: ["DEMONHUNTER"],
  },
  {
    key: "devotion-aura",
    label: "Аура благочестия",
    iconPath: "/raid_buffs/Devotion_Aura.jpg",
    providerClasses: ["PALADIN"],
  },
  {
    key: "hunters-mark",
    label: "Метка охотника",
    iconPath: "/raid_buffs/Hunters_Mark.jpg",
    providerClasses: ["HUNTER"],
  },
  {
    key: "mark-of-the-wild",
    label: "Метка дикой природы",
    iconPath: "/raid_buffs/Mark_of_the_Wild.jpg",
    providerClasses: ["DRUID"],
  },
  {
    key: "mystic-touch",
    label: "Таинственное касание",
    iconPath: "/raid_buffs/Mystic_Touch.jpg",
    providerClasses: ["MONK"],
  },
  {
    key: "power-word-fortitude",
    label: "Стойкость",
    iconPath: "/raid_buffs/Power_Word_Fortitude.jpg",
    providerClasses: ["PRIEST"],
  },
  {
    key: "skyfury",
    label: "Небесная ярость",
    iconPath: "/raid_buffs/Skyfury.jpg",
    providerClasses: ["SHAMAN"],
  },
];

function getClassCounts(members: AddonGroupMember[]) {
  return members.reduce<Record<string, number>>((counts, member) => {
    counts[member.classFile] = (counts[member.classFile] ?? 0) + 1;
    return counts;
  }, {});
}

function getClassLabel(classFile: string) {
  return CLASS_LABELS[classFile] ?? classFile;
}

function addClassNeed(
  needs: Map<string, RaidClassNeed>,
  input: {
    classFile: string;
    current: number;
    reason?: string;
    target: number;
  },
) {
  const missing = Math.max(0, input.target - input.current);

  if (missing === 0) {
    return;
  }

  const existing = needs.get(input.classFile);
  if (existing) {
    existing.target = Math.max(existing.target, input.target);
    existing.missing = Math.max(0, existing.target - existing.current);

    if (input.reason && !existing.reasons.includes(input.reason)) {
      existing.reasons.push(input.reason);
    }

    return;
  }

  needs.set(input.classFile, {
    classFile: input.classFile,
    label: getClassLabel(input.classFile),
    current: input.current,
    target: input.target,
    missing,
    reasons: input.reason ? [input.reason] : [],
  });
}

function getRoleSummary(exportData: Pick<AddonExportData, "groupSize" | "members">) {
  const roleCounts = exportData.members.reduce(
    (counts, member) => ({
      tanks: counts.tanks + (member.role === "TANK" ? 1 : 0),
      healers: counts.healers + (member.role === "HEALER" ? 1 : 0),
      dps: counts.dps + (member.role === "DAMAGER" ? 1 : 0),
    }),
    { tanks: 0, healers: 0, dps: 0 },
  );

  if (exportData.members.length === 0) {
    return `Состав из аддона: ${exportData.groupSize} игроков`;
  }

  return `Танки: ${roleCounts.tanks} • Хилы: ${roleCounts.healers} • ДД: ${roleCounts.dps}`;
}

export function isMythicRaid(
  exportData: Pick<
    AddonExportData,
    | "difficultyID"
    | "difficultyName"
    | "selectedRaidDifficultyID"
    | "selectedRaidDifficultyName"
  >,
) {
  if (
    exportData.difficultyID === 16 ||
    exportData.selectedRaidDifficultyID === 16
  ) {
    return true;
  }

  const difficultyNames = [
    exportData.difficultyName,
    exportData.selectedRaidDifficultyName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /mythic|эпох|мифик/u.test(difficultyNames);
}

export function getRaidCompositionAnalysis(
  exportData: Pick<
    AddonExportData,
    | "difficultyID"
    | "difficultyName"
    | "groupSize"
    | "members"
    | "selectedRaidDifficultyID"
    | "selectedRaidDifficultyName"
  >,
): RaidCompositionAnalysis {
  const classCounts = getClassCounts(exportData.members);
  const armorCounts = ARMOR_ORDER.map((key) => ({
    key,
    label: ARMOR_LABELS[key],
    count: exportData.members.filter(
      (member) => CLASS_ARMOR[member.classFile] === key,
    ).length,
  }));
  const mythic = isMythicRaid(exportData);
  const missingBuffs = RAID_BUFFS.filter(
    (buff) =>
      !buff.providerClasses.some((classFile) => (classCounts[classFile] ?? 0) > 0),
  );
  const classNeedsByClass = new Map<string, RaidClassNeed>();

  if (mythic) {
    MYTHIC_CLASS_RULES.forEach(({ classFile, target }) => {
      addClassNeed(classNeedsByClass, {
        classFile,
        current: classCounts[classFile] ?? 0,
        target,
      });
    });
  }

  missingBuffs.forEach((buff) => {
    buff.providerClasses.forEach((classFile) => {
      addClassNeed(classNeedsByClass, {
        classFile,
        current: classCounts[classFile] ?? 0,
        reason: buff.label,
        target: 1,
      });
    });
  });

  return {
    armorCounts,
    classNeeds: [...classNeedsByClass.values()],
    missingBuffs,
    isMythic: mythic,
    roleSummary: getRoleSummary(exportData),
  };
}

function formatClassNeed(need: RaidClassNeed) {
  const reasonLabel =
    need.reasons.length > 0 ? ` (${need.reasons.join(", ")})` : "";

  return `${need.label} x${need.missing}${reasonLabel}`;
}

export function getRaidRoleNeedLabels(roleNeeds: RaidRoleNeeds) {
  return [
    roleNeeds.tankNeeded > 0 ? `Танк x${roleNeeds.tankNeeded}` : null,
    roleNeeds.healerNeeded > 0 ? `Хил x${roleNeeds.healerNeeded}` : null,
  ].filter((label): label is string => Boolean(label));
}

export function getRaidRecruitmentNeedsLabel({
  roleNeeds,
  analysis,
}: {
  roleNeeds: RaidRoleNeeds;
  analysis?: Pick<RaidCompositionAnalysis, "classNeeds"> | null;
}) {
  const labels = [
    ...getRaidRoleNeedLabels(roleNeeds),
    ...(analysis?.classNeeds.map(formatClassNeed) ?? []),
  ];

  return labels.length > 0
    ? `Нужны: ${labels.join(" • ")}`
    : "Роли и бафы закрыты";
}

export function getRaidClassNeedsLabel(analysis: RaidCompositionAnalysis) {
  if (analysis.classNeeds.length === 0) {
    return analysis.isMythic
      ? "Классовые правила закрыты"
      : analysis.roleSummary;
  }

  return `Нужны: ${analysis.classNeeds
    .map(formatClassNeed)
    .join(" • ")}`;
}

export function getRaidArmorSummary(analysis: RaidCompositionAnalysis) {
  return analysis.armorCounts
    .map((armor) => `${armor.label}: ${armor.count}`)
    .join(" • ");
}
