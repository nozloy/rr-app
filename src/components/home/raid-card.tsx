import Image from "next/image";
import { CalendarDays, Coins, Crown, UsersRound } from "lucide-react";
import type { FeaturedRaid } from "@/components/home/data";
import { DifficultyBadge } from "@/components/home/difficulty-badge";

type RaidCardProps = {
  raid: FeaturedRaid;
};

export function RaidCard({ raid }: RaidCardProps) {
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
        <div className="home-difficulty-row" aria-label="Доступные сложности">
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
            Лидер: {raid.leader}
          </span>
          <span>
            <UsersRound className="size-4" aria-hidden="true" />
            {raid.party}
          </span>
          <span className="home-raid-price">
            <Coins className="size-4" aria-hidden="true" />
            Слот: {raid.slotPrice}
          </span>
        </div>
      </div>
    </article>
  );
}
