import Image from "next/image";
import { Check, LockSimple, QuestionMark } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FORECAST_TARGETS, type RaidForecastCharacter, type RaidForecastDifficulty } from "@/lib/raid-forecast-core";

const classes: Record<number, { file: string; label: string }> = {
  1: { file: "warrior", label: "Воин" }, 2: { file: "paladin", label: "Паладин" },
  3: { file: "hunter", label: "Охотник" }, 4: { file: "rogue", label: "Разбойник" },
  5: { file: "priest", label: "Жрец" }, 6: { file: "deathknight", label: "Рыцарь смерти" },
  7: { file: "shaman", label: "Шаман" }, 8: { file: "mage", label: "Маг" },
  9: { file: "warlock", label: "Чернокнижник" }, 10: { file: "monk", label: "Монах" },
  11: { file: "druid", label: "Друид" }, 12: { file: "demonhunter", label: "Охотник на демонов" },
  13: { file: "evoker", label: "Пробудитель" },
};

export function FortuneRoster({ difficulty, characters, loading }: {
  difficulty: RaidForecastDifficulty;
  characters: RaidForecastCharacter[];
  loading: boolean;
}) {
  return (
    <section aria-labelledby="fortune-roster-title">
      <div className="darkmoon-wood-strip mb-2 flex items-center justify-between gap-3 px-4 py-3">
        <h3 id="fortune-roster-title" className="font-serif text-lg font-bold">Персонажи РЛа</h3>
        <span className="text-[10px] uppercase tracking-widest opacity-75">Ревущий фьорд</span>
      </div>
      <ScrollArea className="h-[340px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring sm:h-[360px]">
        <ul className="pr-3 outline-none" aria-label={`Недельные КД десяти персонажей — ${FORECAST_TARGETS[difficulty].label}`} tabIndex={0}>
          {characters.map((character) => {
            const characterClass = character.classId ? classes[character.classId] : null;
            const status = loading ? "unknown" : character.status;
            const StatusIcon = status === "clean" ? Check : status === "locked" ? LockSimple : QuestionMark;
            const label = loading ? "Проверяем…" : status === "clean" ? "Без КД" : status === "locked" ? "Уже закрыт" : "Не удалось проверить";
            return (
              <li key={character.name} className="flex min-h-[60px] items-center gap-2.5 border-b border-border py-2.5 last:border-0 sm:gap-3" data-lockout={status}>
                <span className="darkmoon-class-icon grid size-9 shrink-0 place-items-center overflow-hidden rounded-full" aria-hidden="true">
                  {characterClass ? <Image src={`/classes/${characterClass.file}.jpg`} alt="" width={36} height={36} className="size-full object-cover" /> : <QuestionMark size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold sm:text-sm" title={`${character.name}-Ревущий фьорд`}>{character.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{characterClass ? `${character.level ? `${character.level} · ` : ""}${characterClass.label}` : "Ревущий фьорд"}</p>
                </div>
                <Badge variant="secondary" className="max-w-[108px] shrink-0 justify-center gap-1 rounded-full px-2.5 py-1 text-center" title={label}>
                  <StatusIcon data-icon="inline-start" aria-hidden="true" />
                  <span>{label}</span>
                </Badge>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">Прокрути свиток, чтобы увидеть всех персонажей</p>
    </section>
  );
}
