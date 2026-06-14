import Image from "next/image";
import { CalendarDays, Crown, Link2, UsersRound } from "lucide-react";
import type { FeaturedRaid } from "@/components/home/data";
import { DifficultyBadge } from "@/components/home/difficulty-badge";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type RaidCardProps = {
  locale: AppLocale;
  raid: FeaturedRaid;
};

export function RaidCard({ locale, raid }: RaidCardProps) {
  return (
    <article className="home-raid-card">
      <div className="home-raid-image">
        <Image
          src={raid.artPath}
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 32vw"
          priority={raid.slug === "march-on-queldanas"}
        />
      </div>
      <div className="home-raid-content">
        <h3>{raid.title}</h3>
        <div className="home-difficulty-row" aria-label={t(locale, "home.raidDifficulties")}>
          {raid.difficulties.map((difficulty) => (
            <DifficultyBadge key={difficulty} value={difficulty} />
          ))}
        </div>
        <div className="home-raid-meta">
          <span>
            <CalendarDays className="size-4" aria-hidden="true" />
            {raid.date}, {raid.time}
          </span>
          <span>
            <Crown className="size-4" aria-hidden="true" />
            {t(locale, "home.raidLeader")}: {raid.leader}
          </span>
          <span>
            <UsersRound className="size-4" aria-hidden="true" />
            {raid.party}
          </span>
        </div>
        <Button
          aria-label={t(locale, "home.raidOpenAria", { name: raid.title })}
          className="home-raid-link"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Link2 className="size-5" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
