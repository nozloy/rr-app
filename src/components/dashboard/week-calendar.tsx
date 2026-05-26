import { ChevronRight } from "lucide-react";
import { weekCalendar } from "@/components/dashboard/data";

export function WeekCalendar() {
  return (
    <section className="dashboard-panel dashboard-calendar-panel">
      <div className="dashboard-panel-heading">
        <h2>Календарь на неделю</h2>
        <a href="#calendar">
          Смотреть календарь
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div className="dashboard-week-grid" id="calendar">
        {weekCalendar.map((day) => (
          <button
            className="dashboard-week-day"
            data-active={day.active}
            key={`${day.day}-${day.date}`}
            type="button"
          >
            <span>{day.day}</span>
            <strong>{day.date}</strong>
            <span className="dashboard-day-dots">
              {day.dots.map((dot) => (
                <i data-tone={dot} key={dot} />
              ))}
            </span>
          </button>
        ))}
      </div>

      <div className="dashboard-calendar-legend">
        <span><i data-tone="raid" /> Рейды</span>
        <span><i data-tone="key" /> Ключи</span>
        <span><i data-tone="farm" /> Фарм</span>
        <span><i data-tone="misc" /> Разное</span>
      </div>
    </section>
  );
}
