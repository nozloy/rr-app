import type { Metadata } from "next";
import Image from "next/image";
import { DarkmoonFooter } from "@/components/kogda-raid/darkmoon-footer";
import { DarkmoonHeader } from "@/components/kogda-raid/darkmoon-header";
import { RaidForecastExperience } from "@/components/kogda-raid/raid-forecast";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Будет ли рейд? — Ярмарка Новолуния | RaidReminder",
  description: "Предсказание ярмарки Новолуния. Загляни в шар Сайджа и узнай, соберутся ли сегодня герои.",
};

export default function KogdaRaidPage() {
  return (
    <main className="darkmoon-page relative isolate flex min-h-dvh flex-col overflow-hidden" lang="ru" id="prediction">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <Image src="/kogda-raid/darkmoon-tent.png" alt="" fill priority sizes="100vw" className="object-cover object-top" />
        <div className="darkmoon-backdrop absolute inset-0" />
      </div>
      <DarkmoonHeader />
      <RaidForecastExperience initialServerNow={new Date().toISOString()} />
      <DarkmoonFooter />
    </main>
  );
}
