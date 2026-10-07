import { workshopFont } from "@/components/home/workshop-font";
import { HeroActions } from "@/components/home/hero-actions";
import { HeroSection } from "@/components/home/hero-section";
import { WorkshopFeatures } from "@/components/home/workshop-features";
import { WorkshopFooter } from "@/components/home/workshop-footer";
import { WorkshopHeader } from "@/components/home/workshop-header";
import { WorkshopEnvironment } from "@/components/home/workshop-environment";
import { WorkshopScenery } from "@/components/home/workshop-scenery";
import { getHeaderUser } from "@/components/shell/app-header";
import { hasRequiredRuntimeEnv } from "@/lib/env";
import { getRequestLocale } from "@/lib/i18n-server";
import "./workshop.css";

export async function HomePage() {
  const envReady = hasRequiredRuntimeEnv();
  const [locale, user] = await Promise.all([
    getRequestLocale(),
    envReady ? getHeaderUser() : Promise.resolve(null),
  ]);

  return (
    <main className={`${workshopFont.variable} workshop-page`} id="top">
      <a className="workshop-skip-link" href="#tools">
        {locale === "ru" ? "Перейти к инструментам" : "Skip to tools"}
      </a>
      <WorkshopEnvironment />
      <WorkshopHeader locale={locale} envReady={envReady} user={user} />
      <div className="workshop-stage">
        <WorkshopScenery />
        <HeroSection locale={locale} />
        <HeroActions locale={locale} />
        <WorkshopFeatures locale={locale} />
      </div>
      <WorkshopFooter locale={locale} />
    </main>
  );
}
