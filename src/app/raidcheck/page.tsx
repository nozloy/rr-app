import { RaidCheckForm } from "@/components/raidcheck/raid-check-form";
import { RaidCheckHero } from "@/components/raidcheck/raid-check-hero";
import { RaidCheckProcess } from "@/components/raidcheck/raid-check-process";
import { AppHeader } from "@/components/shell/app-header";

export default function RaidCheckPage() {
  return (
    <>
      <AppHeader compact />
      <main className="raidcheck-page">
        <RaidCheckHero />
        <RaidCheckProcess />
        <RaidCheckForm />
      </main>
    </>
  );
}
