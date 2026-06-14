import { ChevronRight } from "lucide-react";
import { mythicRuns } from "@/components/dashboard/data";
import { t, type AppLocale } from "@/lib/i18n";

export function MythicOverview({ locale }: { locale: AppLocale }) {
  return (
    <section className="dashboard-panel dashboard-mythic-panel">
      <div className="dashboard-panel-heading">
        <h2>{t(locale, "dashboard.mythicOverview")}</h2>
        <a href="#mythic">
          {t(locale, "dashboard.seasonMidnight")}
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div className="dashboard-mythic-grid" id="mythic">
        <div className="dashboard-mythic-rating">
          <span>{t(locale, "dashboard.score")}</span>
          <strong>2634</strong>
          <small>{locale === "ru" ? "Топ 12.4% · Европа" : "Top 12.4% · Europe"}</small>
        </div>
        <div className="dashboard-mythic-runs">
          <span>{t(locale, "dashboard.completedKeys")}</span>
          <div className="dashboard-key-row">
            {mythicRuns.map((run) => (
              <div className="dashboard-key-card" key={`${run.level}-${run.dungeon}`}>
                <strong>{run.level}</strong>
                <span>{run.dungeon}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
