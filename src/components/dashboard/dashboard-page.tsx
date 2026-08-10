import type { Character } from "@prisma/client";
import Link from "next/link";
import { AccountFeed } from "@/components/dashboard/account-feed";
import { AchievementsPanel } from "@/components/dashboard/achievements-panel";
import { ActivityList } from "@/components/dashboard/activity-list";
import { CharacterRoster } from "@/components/dashboard/character-roster";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import {
  MyEventsPanel,
  type DashboardScheduledEvent,
} from "@/components/dashboard/my-events-panel";
import { MythicOverview } from "@/components/dashboard/mythic-overview";
import { RaidProgress } from "@/components/dashboard/raid-progress";
import { WeekCalendar } from "@/components/dashboard/week-calendar";
import { AppHeader } from "@/components/shell/app-header";
import { t, type AppLocale } from "@/lib/i18n";

export type DashboardProfileTab = "my-events" | "overview";

type DashboardPageViewProps = {
  activeTab: DashboardProfileTab;
  characters: Character[];
  displayName: string;
  isAdmin?: boolean;
  locale: AppLocale;
  scheduledEvents: DashboardScheduledEvent[];
};

export function DashboardPageView({
  activeTab,
  characters,
  displayName,
  isAdmin = false,
  locale,
  scheduledEvents,
}: DashboardPageViewProps) {
  const activeCharacters = characters.filter((character) => character.isActive);
  const topCharacter = activeCharacters[0] ?? characters[0] ?? null;
  const preferredName = topCharacter?.name ?? displayName;
  const headerUser = {
    avatarUrl: topCharacter?.avatarUrl ?? topCharacter?.thumbnailUrl ?? null,
    displayName: preferredName,
    isAdmin,
  };

  return (
    <main className="dashboard-page" id="top">
      <AppHeader user={headerUser} />

      <div className="dashboard-hero-band">
        <DashboardHero displayName={preferredName} locale={locale} />
      </div>

      <div className="dashboard-shell">
        <DashboardSidebar
          activeCount={activeCharacters.length}
          characters={characters}
          displayName={preferredName}
          locale={locale}
          topCharacter={topCharacter}
        />

        <div className="dashboard-main-area">
          <nav className="dashboard-tabs" aria-label={t(locale, "dashboard.profileTabs")}>
            <Link data-active={activeTab === "overview"} href="/profile">
              {t(locale, "dashboard.overview")}
            </Link>
            <Link data-active={activeTab === "my-events"} href="/profile?tab=my-events">
              {t(locale, "dashboard.myEvents")}
            </Link>
          </nav>

          {activeTab === "my-events" ? (
            <div className="dashboard-main-grid dashboard-main-grid-events">
              <MyEventsPanel events={scheduledEvents} locale={locale} />
            </div>
          ) : (
            <div className="dashboard-main-grid">
              <CharacterRoster characters={characters} locale={locale} />
              <RaidProgress locale={locale} />
              <ActivityList kind="upcoming" locale={locale} />
              <ActivityList kind="past" locale={locale} />
              <div className="dashboard-right-stack">
                <WeekCalendar locale={locale} />
                <MythicOverview locale={locale} />
              </div>
              <AchievementsPanel locale={locale} />
              <AccountFeed locale={locale} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
