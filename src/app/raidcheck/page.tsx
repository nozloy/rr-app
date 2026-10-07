import { RaidCheckForm } from "@/components/raidcheck/raid-check-form";
import { RaidCheckHero } from "@/components/raidcheck/raid-check-hero";
import { RaidCheckProcess } from "@/components/raidcheck/raid-check-process";
import { RaidCheckScenery } from "@/components/raidcheck/raid-check-scenery";
import { WorkshopHeader } from "@/components/home/workshop-header";
import { WorkshopFooter } from "@/components/home/workshop-footer";
import { workshopFont } from "@/components/home/workshop-font";
import { getHeaderUser } from "@/components/shell/app-header";
import { hasRequiredRuntimeEnv } from "@/lib/env";
import { getRequestLocale } from "@/lib/i18n-server";
import "@/components/home/workshop.css";
import "@/components/raidcheck/raid-workshop.css";

export default async function RaidCheckPage() {
  const envReady = hasRequiredRuntimeEnv();
  const [locale, user] = await Promise.all([
    getRequestLocale(),
    envReady ? getHeaderUser() : Promise.resolve(null),
  ]);

  return (
    <main className={`${workshopFont.variable} workshop-page raid-workshop`} id="top">
      <a className="workshop-skip-link" href="#raidcheck-workbench">
        {locale === "ru" ? "Перейти к проверке рейда" : "Skip to raid check"}
      </a>
      <RaidCheckScenery />
      <WorkshopHeader locale={locale} envReady={envReady} user={user} />
      <div className="raid-workshop-content">
        <RaidCheckHero locale={locale} />
        <RaidCheckProcess locale={locale} />
        <RaidCheckForm />
      </div>
      <WorkshopFooter locale={locale} />
    </main>
  );
}
