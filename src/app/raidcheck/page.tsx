import { RaidCheckForm } from "@/components/raidcheck/raid-check-form";
import { RaidCheckHero } from "@/components/raidcheck/raid-check-hero";
import { RaidCheckProcess } from "@/components/raidcheck/raid-check-process";
import { AppHeader } from "@/components/shell/app-header";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function RaidCheckPage() {
  const locale = await getRequestLocale();

  return (
    <>
      <AppHeader />
      <main className="raidcheck-page">
        <RaidCheckHero locale={locale} />
        <RaidCheckProcess locale={locale} />
        <RaidCheckForm />
      </main>
    </>
  );
}
