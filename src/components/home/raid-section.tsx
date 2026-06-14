import { ChevronRight } from "lucide-react";
import { getFeaturedRaids } from "@/components/home/data";
import { RaidCard } from "@/components/home/raid-card";
import { SectionHeading } from "@/components/home/section-heading";
import type { AppLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function RaidSection({ locale }: { locale: AppLocale }) {
  const raids = getFeaturedRaids(locale);

  return (
    <section className="home-panel home-raids-panel" id="raids">
      <SectionHeading
        title={
          <>
            {t(locale, "home.raidsTitle")} <span>Midnight</span>
          </>
        }
        action={
          <a href="#raids">
            {t(locale, "home.raidsViewAll")}
            <ChevronRight className="size-4" aria-hidden="true" />
          </a>
        }
      />
      <div className="home-raid-grid">
        {raids.map((raid) => (
          <RaidCard key={raid.slug} locale={locale} raid={raid} />
        ))}
      </div>
    </section>
  );
}
