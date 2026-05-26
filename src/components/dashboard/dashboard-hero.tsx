import { RefreshCw, ShieldCheck } from "lucide-react";

type DashboardHeroProps = {
  displayName: string;
};

export function DashboardHero({ displayName }: DashboardHeroProps) {
  return (
    <section className="dashboard-hero">
      <h1>
        Добро пожаловать, <span>{displayName}</span>
      </h1>
      <p>
        <ShieldCheck className="size-4" aria-hidden="true" />
        Battle.net подключен
        <span>•</span>
        Данные синхронизированы 2 мин. назад
        <RefreshCw className="size-4" aria-hidden="true" />
      </p>
    </section>
  );
}
