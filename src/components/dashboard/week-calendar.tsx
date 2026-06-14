import { ChevronRight } from "lucide-react";
import { weekCalendar } from "@/components/dashboard/data";
import { Button } from "@/components/ui/button";
import { t, type AppLocale } from "@/lib/i18n";

export function WeekCalendar({ locale }: { locale: AppLocale }) {
  return (
    <section className="dashboard-panel dashboard-calendar-panel">
      <div className="dashboard-panel-heading">
        <h2>{t(locale, "dashboard.weekCalendar")}</h2>
        <a href="#calendar">
          {t(locale, "dashboard.viewCalendar")}
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div className="dashboard-week-grid" id="calendar">
        {weekCalendar.map((day) => (
          <Button
            className="dashboard-week-day"
            data-active={day.active}
            key={`${day.day}-${day.date}`}
            type="button"
            variant="ghost"
          >
            <span>{day.day}</span>
            <strong>{day.date}</strong>
            <span className="dashboard-day-dots">
              {day.dots.map((dot) => (
                <i data-tone={dot} key={dot} />
              ))}
            </span>
          </Button>
        ))}
      </div>

      <div className="dashboard-calendar-legend">
        <span><i data-tone="raid" /> {t(locale, "dashboard.raids")}</span>
        <span><i data-tone="key" /> {t(locale, "dashboard.keys")}</span>
        <span><i data-tone="farm" /> {t(locale, "dashboard.farm")}</span>
        <span><i data-tone="misc" /> {t(locale, "dashboard.misc")}</span>
      </div>
    </section>
  );
}
