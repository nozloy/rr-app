import { RefreshCw, ShieldCheck } from "lucide-react";
import { t, type AppLocale } from "@/lib/i18n";

type DashboardHeroProps = {
  displayName: string;
  locale: AppLocale;
};

export function DashboardHero({ displayName, locale }: DashboardHeroProps) {
  return (
    <section className="dashboard-hero">
      <h1>
        {t(locale, "dashboard.welcome", { name: displayName })}
      </h1>
      <p>
        <ShieldCheck className="size-4" aria-hidden="true" />
        {t(locale, "dashboard.battleNetConnected")}
        <span>•</span>
        {t(locale, "dashboard.syncedAgo")}
        <RefreshCw className="size-4" aria-hidden="true" />
      </p>
    </section>
  );
}
