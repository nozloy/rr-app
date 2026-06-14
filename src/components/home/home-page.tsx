import { ActivityStrip } from "@/components/home/activity-strip";
import { FeatureTiles } from "@/components/home/feature-tiles";
import { HeroSection } from "@/components/home/hero-section";
import { RaidSection } from "@/components/home/raid-section";
import { SiteFooter } from "@/components/home/site-footer";
import { AppHeader } from "@/components/shell/app-header";
import { getRequestLocale } from "@/lib/i18n-server";

export async function HomePage() {
  const locale = await getRequestLocale();

  return (
    <main className="home-page" id="top">
      <div className="home-hero-shell">
        <AppHeader />
        <HeroSection locale={locale} />
      </div>

      <div className="home-content">
        <RaidSection locale={locale} />
        <ActivityStrip locale={locale} />
        <FeatureTiles locale={locale} />
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}
