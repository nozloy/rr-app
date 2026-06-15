import Image from "next/image";

export const classLabels: Record<string, Record<"ru" | "en", string>> = {
  DEATHKNIGHT: { en: "Death Knight", ru: "Рыцарь смерти" },
  DEMONHUNTER: { en: "Demon Hunter", ru: "Охотник на демонов" },
  DRUID: { en: "Druid", ru: "Друид" },
  EVOKER: { en: "Evoker", ru: "Пробудитель" },
  HUNTER: { en: "Hunter", ru: "Хант" },
  MAGE: { en: "Mage", ru: "Маг" },
  MONK: { en: "Monk", ru: "Монк" },
  PALADIN: { en: "Paladin", ru: "Пал" },
  PRIEST: { en: "Priest", ru: "Жрец" },
  ROGUE: { en: "Rogue", ru: "Рога" },
  SHAMAN: { en: "Shaman", ru: "Шам" },
  WARLOCK: { en: "Warlock", ru: "Лок" },
  WARRIOR: { en: "Warrior", ru: "Вар" },
};

const classIconFiles: Record<string, string> = {
  DEATHKNIGHT: "deathknight",
  DEMONHUNTER: "demonhunter",
  DRUID: "druid",
  EVOKER: "evoker",
  HUNTER: "hunter",
  MAGE: "mage",
  MONK: "monk",
  PALADIN: "paladin",
  PRIEST: "priest",
  ROGUE: "rogue",
  SHAMAN: "shaman",
  WARLOCK: "warlock",
  WARRIOR: "warrior",
};

export function getClassLabel(classFile: string, locale: "ru" | "en") {
  const normalizedClass = classFile.trim().toUpperCase();

  return classLabels[normalizedClass]?.[locale] ?? (normalizedClass || "—");
}

export function RaidCheckClassIcon({
  classFile,
  locale,
}: {
  classFile: string;
  locale: "ru" | "en";
}) {
  const normalizedClass = classFile.trim().toUpperCase();
  const classIconFile = classIconFiles[normalizedClass];
  const classLabel = getClassLabel(classFile, locale);

  if (!classIconFile) {
    return (
      <span className="raidcheck-class-fallback" title={classLabel}>
        {classLabel}
      </span>
    );
  }

  return (
    <span
      className="raidcheck-class-icon"
      data-class={normalizedClass}
      title={classLabel}
    >
      <Image
        alt={classLabel}
        height={32}
        src={`/classes/${classIconFile}.jpg`}
        width={32}
      />
    </span>
  );
}
