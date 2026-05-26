import { ChevronRight } from "lucide-react";
import { accountFeed } from "@/components/dashboard/data";

export function AccountFeed() {
  return (
    <section className="dashboard-panel dashboard-feed-panel">
      <div className="dashboard-panel-heading">
        <h2>Активность аккаунта</h2>
        <a href="#feed">
          Вся история
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
