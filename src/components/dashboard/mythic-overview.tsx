import { ChevronRight } from "lucide-react";
import { mythicRuns } from "@/components/dashboard/data";

export function MythicOverview() {
  return (
    <section className="dashboard-panel dashboard-mythic-panel">
      <div className="dashboard-panel-heading">
        <h2>Mythic+ обзор</h2>
        <a href="#mythic">
          Сезон 2 · Midnight
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div className="dashboard-mythic-grid" id="mythic">
        <div className="dashboard-mythic-rating">
          <span>Рейтинг (Raider.IO)</span>
          <strong>2634</strong>
          <small>Топ 12.4% · Европа</small>
        </div>
        <div className="dashboard-mythic-runs">
          <span>Пройденные ключи</span>
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
