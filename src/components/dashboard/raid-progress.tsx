import Image from "next/image";
import { ChevronRight, Gift } from "lucide-react";
import { getRaidProgressCards } from "@/components/dashboard/data";
import { t, type AppLocale } from "@/lib/i18n";

function ProgressLine({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: number;
}) {
  return (
    <div className="dashboard-progress-line" data-tone={tone}>
      <div>
        <span>{label}</span>
        <strong>{value}/10</strong>
      </div>
      <span className="dashboard-progress-track">
        <span style={{ width: `${value * 10}%` }} />
      </span>
    </div>
  );
}

export function RaidProgress({ locale }: { locale: AppLocale }) {
  const raidProgressCards = getRaidProgressCards(locale);

  return (
    <section className="dashboard-panel dashboard-raid-progress">
      <div className="dashboard-panel-heading">
        <h2>{t(locale, "dashboard.raidProgressTitle")}</h2>
        <a href="#raid-progress">
          {t(locale, "dashboard.detailedStats")}
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div className="dashboard-raid-progress-grid" id="raid-progress">
        {raidProgressCards.map(({ heroic, mythic, normal, raid, rewards, total }) => (
          <article className="dashboard-raid-progress-card" key={raid.slug}>
            <div className="dashboard-raid-progress-image">
              <Image src={raid.artPath} alt="" fill sizes="(max-width: 900px) 100vw, 26vw" />
              <h3>{raid.name}</h3>
            </div>

            <div className="dashboard-raid-progress-body">
              <ProgressLine label="NORMAL" tone="normal" value={normal} />
              <ProgressLine label="HEROIC" tone="heroic" value={heroic} />
              <ProgressLine label="MYTHIC" tone="mythic" value={mythic} />
              <div className="dashboard-raid-progress-footer">
                <span>
                  {t(locale, "dashboard.overallProgress")}: <strong>{total}%</strong>
                </span>
                <span>
                  {t(locale, "dashboard.rewards")}: {rewards}
                  <Gift className="size-4" aria-hidden="true" />
                </span>
              </div>
              <span className="dashboard-overall-track">
                <span style={{ width: `${total}%` }} />
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
