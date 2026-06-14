import Image from "next/image";
import type { Character } from "@prisma/client";
import { ChevronRight, Cross, Shield, Swords, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t, type AppLocale } from "@/lib/i18n";
import { formatItemLevel } from "@/lib/utils";

type CharacterRosterProps = {
  characters: Character[];
  locale: AppLocale;
};

function getCharacterImage(character: Character) {
  return character.avatarUrl ?? character.thumbnailUrl ?? null;
}

function getRole(character: Character, locale: AppLocale) {
  const value = `${character.className} ${character.activeSpec ?? ""}`.toLowerCase();

  if (/(защит|protection|blood|guardian|brewmaster|vengeance)/i.test(value)) {
    return { label: locale === "ru" ? "Танк" : "Tank", icon: Shield, tone: "tank" };
  }

  if (/(свет|holy|discipline|restoration|mistweaver|preservation|хил|лекар)/i.test(value)) {
    return { label: locale === "ru" ? "Хилер" : "Healer", icon: Cross, tone: "healer" };
  }

  return { label: "DPS", icon: Swords, tone: "dps" };
}

export function CharacterRoster({ characters, locale }: CharacterRosterProps) {
  return (
    <section className="dashboard-panel dashboard-character-panel">
      <div className="dashboard-panel-heading">
        <h2>{t(locale, "dashboard.myCharacters")}</h2>
        <a href="#characters">
          {t(locale, "dashboard.allCharacters")}
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      {characters.length === 0 ? (
        <div className="dashboard-empty-state">
          <UsersRound className="size-8" aria-hidden="true" />
          <strong>{t(locale, "dashboard.noCharacters")}</strong>
          <span>{t(locale, "dashboard.runSyncHint")}</span>
        </div>
      ) : (
        <ScrollArea className="dashboard-character-scroll">
          <div className="dashboard-character-list" id="characters">
            {characters.map((character) => {
              const avatar = getCharacterImage(character);
              const role = getRole(character, locale);
              const RoleIcon = role.icon;

              return (
                <article
                  className="dashboard-character-row"
                  data-active={character.isActive}
                  key={character.id}
                >
                  <span className="dashboard-character-avatar" aria-hidden="true">
                    {avatar ? (
                      <Image src={avatar} alt="" width={44} height={44} unoptimized />
                    ) : (
                      character.name.slice(0, 1).toUpperCase()
                    )}
                  </span>

                  <div className="dashboard-character-main">
                    <strong>{character.name}</strong>
                    <span>
                      {character.className} · {character.activeSpec ?? t(locale, "dashboard.specUnknown")}
                    </span>
                  </div>

                  <span className="dashboard-character-level">{character.level}</span>
                  <span className="dashboard-character-ilvl">
                    ilvl {formatItemLevel(character.itemLevel)}
                  </span>
                  <Badge className="dashboard-role-badge" data-role={role.tone} variant="outline">
                    <RoleIcon className="size-4" aria-hidden="true" />
                    {role.label}
                  </Badge>
                  <span className="dashboard-character-faction">{character.factionName}</span>
                  <span className={character.isActive ? "dashboard-online" : "dashboard-offline"}>
                    {character.isActive ? t(locale, "dashboard.online") : t(locale, "dashboard.offline")}
                  </span>
                </article>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}
