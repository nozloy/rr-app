import { ChevronRight } from "lucide-react";
import { featuredRaids } from "@/components/home/data";
import { RaidCard } from "@/components/home/raid-card";
import { SectionHeading } from "@/components/home/section-heading";

export function RaidSection() {
  return (
    <section className="home-panel home-raids-panel" id="raids">
      <SectionHeading
        title={
          <>
            Актуальные рейды <span>Midnight</span>
          </>
        }
        action={
          <a href="#raids">
            Смотреть все рейды
            <ChevronRight className="size-4" aria-hidden="true" />
          </a>
        }
      />
      <div className="home-raid-grid">
        {featuredRaids.map((raid) => (
          <RaidCard key={raid.slug} raid={raid} />
        ))}
      </div>
    </section>
  );
}
