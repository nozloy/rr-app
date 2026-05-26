import Image from "next/image";
import { ChevronRight, Coins, Swords, UsersRound } from "lucide-react";
import { pastActivities, upcomingActivities } from "@/components/dashboard/data";
import { Badge } from "@/components/ui/badge";

type ActivityListProps = {
  kind: "past" | "upcoming";
};

export function ActivityList({ kind }: ActivityListProps) {
  const items = kind === "upcoming" ? upcomingActivities : pastActivities;
  const title = kind === "upcoming" ? "Будущие активности" : "Прошлые активности";

  return (
    <section className="dashboard-panel dashboard-activity-panel">
      <div className="dashboard-panel-heading">
        <h2>{title}</h2>
        <a href="#activity">
          Все
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div className="dashboard-activity-list" id={kind === "upcoming" ? "activity" : undefined}>
        {items.map((item) => (
          <article className="dashboard-activity-row" key={`${kind}-${item.title}`}>
            <span className="dashboard-activity-icon" aria-hidden="true">
              {item.icon ? (
                <Image src={item.icon} alt="" fill sizes="44px" />
              ) : (
                <Swords className="size-5" />
              )}
            </span>
            <div className="dashboard-activity-main">
              <strong>{item.title}</strong>
              <span>
                {item.date}
                {"time" in item ? `  ${item.time}` : ""}
              </span>
            </div>
            {"type" in item ? (
              <Badge className="dashboard-activity-type" variant="outline">
                {item.type}
              </Badge>
            ) : (
              <Badge className="dashboard-activity-status" variant="success">
                {item.status}
              </Badge>
            )}
            <span className="dashboard-activity-meta">
              <UsersRound className="size-4" aria-hidden="true" />
              {item.party}
            </span>
            <span className="dashboard-activity-meta">
              <Coins className="size-4" aria-hidden="true" />
              {item.reward}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
