import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { achievements } from "@/components/dashboard/data";

export function AchievementsPanel() {
  return (
    <section className="dashboard-panel dashboard-achievements-panel">
      <div className="dashboard-panel-heading">
        <h2>Последние достижения</h2>
        <a href="#achievements">
          Все достижения
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div className="dashboard-achievement-grid" id="achievements">
        {achievements.map((achievement) => (
          <article className="dashboard-achievement-card" key={achievement.title}>
            <span className="dashboard-achievement-icon" aria-hidden="true">
              {achievement.icon ? (
                <Image src={achievement.icon} alt="" fill sizes="58px" />
              ) : null}
            </span>
            <div>
              <strong>{achievement.title}</strong>
              <p>{achievement.text}</p>
              <small>{achievement.date}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
