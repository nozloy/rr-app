import type { Character } from "@prisma/client";
import { AccountFeed } from "@/components/dashboard/account-feed";
import { AchievementsPanel } from "@/components/dashboard/achievements-panel";
import { ActivityList } from "@/components/dashboard/activity-list";
import { CharacterRoster } from "@/components/dashboard/character-roster";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { MythicOverview } from "@/components/dashboard/mythic-overview";
import { RaidProgress } from "@/components/dashboard/raid-progress";
import { WeekCalendar } from "@/components/dashboard/week-calendar";
import { AppHeader } from "@/components/shell/app-header";

type DashboardPageViewProps = {
  characters: Character[];
  displayName: string;
};

export function DashboardPageView({
  characters,
  displayName,
}: DashboardPageViewProps) {
  const activeCharacters = characters.filter((character) => character.isActive);
  const topCharacter = activeCharacters[0] ?? characters[0] ?? null;
  const preferredName = topCharacter?.name ?? displayName;
  const headerUser = {
    avatarUrl: topCharacter?.avatarUrl ?? topCharacter?.thumbnailUrl ?? null,
    displayName: preferredName,
  };

  return (
    <main className="dashboard-page" id="top">
      <AppHeader compact user={headerUser} />

      <div className="dashboard-hero-band">
        <DashboardHero displayName={preferredName} />
      </div>

      <div className="dashboard-shell">
        <DashboardSidebar
          activeCount={activeCharacters.length}
          characters={characters}
          displayName={preferredName}
          topCharacter={topCharacter}
        />

        <div className="dashboard-main-grid">
          <CharacterRoster characters={characters} />
          <RaidProgress />
          <ActivityList kind="upcoming" />
          <ActivityList kind="past" />
          <div className="dashboard-right-stack">
            <WeekCalendar />
            <MythicOverview />
          </div>
          <AchievementsPanel />
          <AccountFeed />
        </div>
      </div>
    </main>
  );
}
