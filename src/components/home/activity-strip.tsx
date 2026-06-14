import { ChevronRight } from "lucide-react";
import { getActivityItems } from "@/components/home/data";
import { SectionHeading } from "@/components/home/section-heading";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function ActivityStrip({ locale }: { locale: AppLocale }) {
  const activityItems = getActivityItems(locale);

  return (
    <section className="home-panel home-activities-panel" id="activities">
      <SectionHeading
        title={t(locale, "home.activitiesTitle")}
        action={
          <a href="#activities">
            {t(locale, "home.activitiesViewAll")}
            <ChevronRight className="size-4" aria-hidden="true" />
          </a>
        }
      />
      <div className="home-activity-grid">
        {activityItems.map((activity) => {
          const Icon = activity.icon;

          return (
            <Button
              className="home-activity-card"
              data-tone={activity.tone}
              key={activity.label}
              type="button"
              variant="ghost"
            >
              <Icon className="size-10" aria-hidden="true" />
              <span>{activity.label}</span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
