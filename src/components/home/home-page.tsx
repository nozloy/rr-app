import { ActivityStrip } from "@/components/home/activity-strip";
import { FeatureTiles } from "@/components/home/feature-tiles";
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
        <RaidSection />
        <ActivityStrip />
        <FeatureTiles />
      </div>

      <SiteFooter />
    </main>
  );
}
