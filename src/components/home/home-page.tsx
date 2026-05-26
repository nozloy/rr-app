import { ActivityStrip } from "@/components/home/activity-strip";
import { EventFormPanel } from "@/components/home/event-form-panel";
import { FeatureTiles } from "@/components/home/feature-tiles";
import { FilterBar } from "@/components/home/filter-bar";
import { HeroSection } from "@/components/home/hero-section";
import { RaidSection } from "@/components/home/raid-section";
import { SiteFooter } from "@/components/home/site-footer";
import { AppHeader } from "@/components/shell/app-header";

export function HomePage() {
  return (
    <main className="home-page" id="top">
      <div className="home-hero-shell">
        <AppHeader />
        <HeroSection />
      </div>

      <div className="home-content">
        <FilterBar />

        <div className="home-dashboard-grid">
          <div className="home-primary-column">
            <RaidSection />
            <ActivityStrip />
          </div>
          <EventFormPanel />
        </div>

        <FeatureTiles />
      </div>

      <SiteFooter />
    </main>
  );
}
