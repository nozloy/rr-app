import { ChevronRight } from "lucide-react";
import { activityItems } from "@/components/home/data";
import { SectionHeading } from "@/components/home/section-heading";

export function ActivityStrip() {
  return (
    <section className="home-panel home-activities-panel" id="activities">
      <SectionHeading
        title="Популярные активности"
        action={
          <a href="#activities">
            Смотреть все
            <ChevronRight className="size-4" aria-hidden="true" />
          </a>
        }
      />
      <div className="home-activity-grid">
        {activityItems.map((activity) => {
          const Icon = activity.icon;

          return (
            <button className="home-activity-card" data-tone={activity.tone} key={activity.label} type="button">
              <Icon className="size-10" aria-hidden="true" />
              <span>{activity.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
