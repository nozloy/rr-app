import Image from "next/image";
import type { Character } from "@prisma/client";
import { ChevronRight, Cross, Shield, Swords, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatItemLevel } from "@/lib/utils";

type CharacterRosterProps = {
  characters: Character[];
};

function getCharacterImage(character: Character) {
  return character.avatarUrl ?? character.thumbnailUrl ?? null;
}

function getRole(character: Character) {
  const value = `${character.className} ${character.activeSpec ?? ""}`.toLowerCase();

  if (/(защит|protection|blood|guardian|brewmaster|vengeance)/i.test(value)) {
    return { label: "Танк", icon: Shield, tone: "tank" };
  }

  if (/(свет|holy|discipline|restoration|mistweaver|preservation|хил|лекар)/i.test(value)) {
    return { label: "Хилер", icon: Cross, tone: "healer" };
  }

  return { label: "DPS", icon: Swords, tone: "dps" };
}

export function CharacterRoster({ characters }: CharacterRosterProps) {
  return (
    <section className="dashboard-panel dashboard-character-panel">
      <div className="dashboard-panel-heading">
        <h2>Мои персонажи</h2>
        <a href="#characters">
          Все персонажи
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      {characters.length === 0 ? (
        <div className="dashboard-empty-state">
          <UsersRound className="size-8" aria-hidden="true" />
          <strong>Персонажи пока не подтянуты</strong>
          <span>Запустите синхронизацию в боковой панели.</span>
        </div>
      ) : (
        <ScrollArea className="dashboard-character-scroll">
          <div className="dashboard-character-list" id="characters">
            {characters.map((character) => {
              const avatar = getCharacterImage(character);
              const role = getRole(character);
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
                      {character.className} · {character.activeSpec ?? "Спек не определён"}
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
                    {character.isActive ? "В игре" : "Оффлайн"}
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
