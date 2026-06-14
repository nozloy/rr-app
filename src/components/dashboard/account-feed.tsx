import { ChevronRight } from "lucide-react";
import { accountFeed } from "@/components/dashboard/data";
import { t, type AppLocale } from "@/lib/i18n";

export function AccountFeed({ locale }: { locale: AppLocale }) {
  return (
    <section className="dashboard-panel dashboard-feed-panel">
      <div className="dashboard-panel-heading">
        <h2>{t(locale, "dashboard.accountActivity")}</h2>
        <a href="#feed">
          {t(locale, "dashboard.fullHistory")}
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div className="dashboard-feed-grid" id="feed">
        {accountFeed.map((item) => {
          const Icon = item.icon;

          return (
            <article className="dashboard-feed-item" data-tone={item.tone} key={item.text}>
              <Icon className="size-6" aria-hidden="true" />
              <div>
                <strong>{item.text}</strong>
                <span>{item.time}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
